import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from database import SessionLocal, CommodityPrice

# Constants for conversion
TROY_OUNCE_TO_GRAMS = 31.1034768
INDIA_IMPORT_DUTY_MULTIPLIER = 1.15 # Approx 15% combined duty and premium

def fetch_historical_data(years=2):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365 * years)

    # Fetch global futures and currency
    print("Fetching global Gold, Silver, and USD/INR rates...")
    gold_data = yf.download("GC=F", start=start_date, end=end_date)
    silver_data = yf.download("SI=F", start=start_date, end=end_date)
    inr_data = yf.download("INR=X", start=start_date, end=end_date)

    db = SessionLocal()

    try:
        process_and_store(db, gold_data, inr_data, "GOLD")
        process_and_store(db, silver_data, inr_data, "SILVER")
        db.commit()
        print("Successfully seeded the database with historical data!")
    except Exception as e:
        db.rollback()
        print(f"Error persisting to database: {e}")
    finally:
        db.close()

def process_and_store(db, asset_df, inr_df, asset_name):
    # Combine datasets
    df = pd.DataFrame()
    df['usd_price'] = asset_df['Close']
    df['volume'] = asset_df['Volume']
    df['usd_inr'] = inr_df['Close']

    df.ffill(inplace=True) # Forward fill missing data
    df.dropna(inplace=True)

    records = []
    for date, row in df.iterrows():
        usd_px = float(row['usd_price'])
        usdinr = float(row['usd_inr'])
        vol = float(row['volume'])

        # Calculate INR per 10 grams (Base calculation + Indian Premium/Duty)
        price_per_gram_usd = usd_px / TROY_OUNCE_TO_GRAMS
        price_per_10g_inr_base = price_per_gram_usd * usdinr * 10
        
        # 24k Retail Estimate
        retail_24k = price_per_10g_inr_base * INDIA_IMPORT_DUTY_MULTIPLIER
        
        retail_22k = retail_24k * 0.9167
        retail_18k = retail_24k * 0.7500

        record = CommodityPrice(
            date=date.date(),
            asset=asset_name,
            usd_price=usd_px,
            usd_inr_rate=usdinr,
            inr_price_24k=retail_24k,
            inr_price_22k=retail_22k,
            inr_price_18k=retail_18k,
            volume=vol
        )
        records.append(record)

    # Prevent duplicate seeding
    existing_dates = {r[0] for r in db.query(CommodityPrice.date).filter(CommodityPrice.asset == asset_name).all()}
    new_records = [r for r in records if r.date not in existing_dates]

    db.add_all(new_records)
    print(f"Inserted {len(new_records)} new {asset_name} price records.")

if __name__ == "__main__":
    fetch_historical_data()
