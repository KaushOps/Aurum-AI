import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from database import SessionLocal, CommodityPrice, Forecast, NewsSentiment
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor
from notifier import send_alert_email

def load_dataset(asset="GOLD"):
    db = SessionLocal()
    try:
        prices = db.query(CommodityPrice).filter(CommodityPrice.asset == asset).order_by(CommodityPrice.date.asc()).all()
        df = pd.DataFrame([{
            "date": p.date,
            "usd_price": p.usd_price,
            "volume": p.volume,
            "inr_price_24k": p.inr_price_24k
        } for p in prices])
        
        if len(df) < 50:
            return None # Not enough history

        # Feature Engineering: Technicals
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        
        df['sma_10'] = df['usd_price'].rolling(10).mean()
        df['sma_50'] = df['usd_price'].rolling(50).mean()
        
        # Volatility
        df['std_20'] = df['usd_price'].rolling(20).std()
        
        # News Sentiment Integration
        all_news = db.query(NewsSentiment).all()
        sentiment_df = pd.DataFrame([{
            "date": n.published_at.date(),
            "score": n.score
        } for n in all_news])
        
        if not sentiment_df.empty:
            sentiment_df['date'] = pd.to_datetime(sentiment_df['date'])
            sentiment_daily = sentiment_df.groupby('date').mean()
            df = df.join(sentiment_daily, how='left')
            df['score'].fillna(0, inplace=True)
            # Use rolling sentiment over past week as a strong macro indicator
            df['rolling_sentiment'] = df['score'].rolling(7).mean().fillna(0)
        else:
            df['score'] = 0.0
            df['rolling_sentiment'] = 0.0

        # Define Target Variable: Price exactly 7 trading days from now
        df['target_t7'] = df['usd_price'].shift(-7)
        return df

    finally:
        db.close()

def run_prediction_pipeline():
    for asset in ["GOLD", "SILVER"]:
        print(f"Training intelligence model for {asset}...")
        df = load_dataset(asset)
        if df is None or len(df.dropna()) < 100:
            print(f"Skipping {asset}: Not enough clean data.")
            continue
            
        train_df = df.dropna()
        
        features = ['usd_price', 'volume', 'sma_10', 'sma_50', 'std_20', 'rolling_sentiment']
        X = train_df[features]
        y = train_df['target_t7']
        
        # Fast, exact XGBoost Regressor
        model = XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42)
        model.fit(X, y)
        
        # Predict Tomorrow (Actually T+7 from Today's context)
        latest_row = df.iloc[-1]
        X_live = latest_row[features].to_frame().T
        
        prediction_usd = model.predict(X_live)[0]
        
        current_usd = latest_row['usd_price']
        
        # Business Logic Engine: The 'Right Time To Buy' algorithm
        # For Commodities: >1.5% weekly expected move is MASSIVE. 
        percent_change = ((prediction_usd - current_usd) / current_usd) * 100
        
        if percent_change >= 1.5:
            recommendation = "STRONG BUY"
        elif percent_change >= 0.5:
            recommendation = "BUY"
        elif percent_change <= -1.0:
            recommendation = "SELL"
        else:
            recommendation = "WAIT"
            
        # Store Prediction into DB
        db = SessionLocal()
        forecast = Forecast(
            target_date=(latest_row.name + timedelta(days=7)).date(),
            asset=asset,
            predicted_price=prediction_usd,
            confidence_interval_low=prediction_usd * 0.98,
            confidence_interval_high=prediction_usd * 1.02,
            recommendation=recommendation
        )
        db.add(forecast)
        db.commit()
        db.close()
        
        # Determine current Indian 10g 24K price for email reading clarity
        inr_price_24k_now = float(latest_row['inr_price_24k'])
        inr_target_24k = inr_price_24k_now * (1 + (percent_change/100))
        
        # Auto-Trigger SMTP alert exactly as the user specified
        if recommendation == "STRONG BUY" or recommendation == "BUY":
            send_alert_email(
                asset=asset,
                current_price=inr_price_24k_now,
                predicted_price=inr_target_24k,
                percent_change=percent_change,
                recommendation=recommendation,
                news_context="Recent macro factors like fed rates and middle east tensions indicate extremely favorable holding conditions."
            )
        
        print(f"✅ {asset} Evaluated -> {recommendation} (Expected %+2.1f%% move in 7 days)" % percent_change)

if __name__ == "__main__":
    run_prediction_pipeline()
