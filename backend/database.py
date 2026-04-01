from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Date
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./gold_silver_data.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class CommodityPrice(Base):
    __tablename__ = "commodity_prices"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    asset = Column(String, index=True) # "GOLD" or "SILVER"
    usd_price = Column(Float) # Global spot price per Oz
    usd_inr_rate = Column(Float)
    inr_price_24k = Column(Float) # Per 10g
    inr_price_22k = Column(Float) # Per 10g
    inr_price_18k = Column(Float) # Per 10g
    volume = Column(Float)

class NewsSentiment(Base):
    __tablename__ = "news_sentiment"
    id = Column(Integer, primary_key=True, index=True)
    published_at = Column(DateTime, index=True)
    headline = Column(String)
    url = Column(String, unique=True)
    source = Column(String)
    score = Column(Float) # FinBERT sentiment score (-1 to 1)
    label = Column(String) # BULLISH, BEARISH, NEUTRAL

class Forecast(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    target_date = Column(Date, index=True)
    asset = Column(String)
    predicted_price = Column(Float)
    confidence_interval_low = Column(Float)
    confidence_interval_high = Column(Float)
    recommendation = Column(String) # Strong Buy, Hold, Wait

Base.metadata.create_all(bind=engine)
