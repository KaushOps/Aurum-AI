from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, CommodityPrice, NewsSentiment, Forecast
from typing import List
from apscheduler.schedulers.background import BackgroundScheduler
import threading

# Import the functional modules
from data_ingestion import fetch_historical_data
from news_scraper import fetch_and_score_news
from ml_engine import run_prediction_pipeline

app = FastAPI(title="Aurum AI API", description="Gold & Silver Intelligence Dashboard")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def unified_intelligence_pipeline():
    """
    Executes the entire Aurum AI workflow sequentially in the background.
    """
    print("\n[AURUM AI] Initiating full system scan...")
    # 1. Update latest exact spot pricing & purity mappings
    fetch_historical_data(years=2)
    # 2. Scrape geopolitical news & run FinBERT inference
    fetch_and_score_news()
    # 3. Formulate predictive models & dispatch email alerts
    run_prediction_pipeline()
    print("[AURUM AI] System scan complete! 🚀\n")

@app.on_event("startup")
def start_recurring_jobs():
    scheduler = BackgroundScheduler()
    # Run the massive scraping and ML update every 6 hours
    scheduler.add_job(unified_intelligence_pipeline, 'interval', hours=6)
    scheduler.start()
    
    # Kick off initial scan immediately in a separate thread so API doesn't hang
    threading.Thread(target=unified_intelligence_pipeline, daemon=True).start()

@app.get("/")
def read_root():
    return {"message": "Aurum AI API is operational"}

@app.get("/api/historical/{asset}")
def get_historical_data(asset: str, days: int = 365):
    """
    Returns historical data for GOLD or SILVER.
    """
    db = SessionLocal()
    try:
        data = db.query(CommodityPrice).filter(CommodityPrice.asset == asset.upper()).order_by(CommodityPrice.date.desc()).limit(days).all()
        return data[::-1]  # Return chronologically
    finally:
        db.close()

@app.get("/api/sentiment")
def get_recent_news():
    """
    Returns recent news headlines with their FinBERT sentiment scores.
    """
    db = SessionLocal()
    try:
        news = db.query(NewsSentiment).order_by(NewsSentiment.published_at.desc()).limit(20).all()
        return news
    finally:
        db.close()

@app.get("/api/predictions")
def get_latest_predictions():
    """
    Returns the latest T+7 ML model predictions and 'Right Time to Buy' recommendations.
    """
    db = SessionLocal()
    try:
        forecasts = db.query(Forecast).order_by(Forecast.generated_at.desc()).limit(2).all()
        return forecasts
    finally:
        db.close()
