from gnews import GNews
from transformers import pipeline
from database import SessionLocal, NewsSentiment
from datetime import datetime
import pandas as pd

# Initialize the NLP Pipeline (Financial BERT)
# This model outputs: positive, negative, or neutral
print("Loading FinBERT Model... (This may take a moment)")
sentiment_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")

KEYWORDS = [
    "Federal Reserve Interest Rate",
    "US Inflation CPI",
    "Middle East Geopolitics",
    "Gold Price Forecast"
]

def fetch_and_score_news():
    google_news = GNews(language='en', country='US', period='7d', max_results=10)
    db = SessionLocal()
    
    unique_urls = {r[0] for r in db.query(NewsSentiment.url).all()}
    scraped_data = []

    for keyword in KEYWORDS:
        print(f"Scraping news for: {keyword}...")
        articles = google_news.get_news(keyword)
        
        for article in articles:
            url = article.get('url')
            if url in unique_urls:
                continue
                
            headline = article.get('title')
            source = article.get('publisher', {}).get('title', 'Unknown')
            pub_date_str = article.get('published date')
            
            try:
                # GNews usually returns "Sun, 01 Apr 2026 10:00:00 GMT" format
                pub_date = pd.to_datetime(pub_date_str).to_pydatetime().replace(tzinfo=None)
            except Exception:
                pub_date = datetime.utcnow()
                
            # FinBERT Prediction
            # Note: FinBERT uses "positive", "negative", "neutral"
            result = sentiment_pipeline(headline)[0]
            label = result['label'].upper()
            score = result['score'] # Confidence
            
            # Convert label to float impact metric: BULLISH (+), BEARISH (-)
            # Often, for Gold, "negative" economic news (e.g., stock crashes) is POSITIVE for Gold.
            # However, for simplicity, we map Positive -> Bullish, Negative -> Bearish
            if label == "POSITIVE":
                mapped_label = "BULLISH"
                impact = score
            elif label == "NEGATIVE":
                mapped_label = "BEARISH"
                impact = -score
            else:
                mapped_label = "NEUTRAL"
                impact = 0.0

            news_record = NewsSentiment(
                published_at=pub_date,
                headline=headline,
                url=url,
                source=source,
                score=impact,
                label=mapped_label
            )
            
            scraped_data.append(news_record)
            unique_urls.add(url)
            
    if scraped_data:
        db.add_all(scraped_data)
        db.commit()
    
    print(f"Ingested and scored {len(scraped_data)} fresh articles into the AI Engine.")
    db.close()

if __name__ == "__main__":
    fetch_and_score_news()
