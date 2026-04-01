import { useState, useEffect, useCallback } from 'react';
import './App.css';
import PriceChart from './PriceChart';
import { fetchHistorical, fetchPredictions, fetchSentiment, checkHealth } from './api';

const TIMEFRAMES = ['1M', '3M', '6M', '1Y', '2Y', 'ALL'];

function formatINR(val) {
  if (!val) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatUSD(val) {
  if (!val) return '—';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function App() {
  const [asset, setAsset] = useState('GOLD');
  const [timeframe, setTimeframe] = useState('1Y');
  const [historicalData, setHistoricalData] = useState({ GOLD: [], SILVER: [] });
  const [predictions, setPredictions] = useState([]);
  const [news, setNews] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    setLoading(true);

    const online = await checkHealth();
    setIsOnline(online);

    if (online) {
      const [goldData, silverData, preds, sentiment] = await Promise.all([
        fetchHistorical('GOLD', 730),
        fetchHistorical('SILVER', 730),
        fetchPredictions(),
        fetchSentiment(),
      ]);
      setHistoricalData({ GOLD: goldData, SILVER: silverData });
      setPredictions(preds);
      setNews(sentiment);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadAllData, 300000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const isGold = asset === 'GOLD';
  const accentClass = isGold ? 'gold' : 'silver';
  const currentData = historicalData[asset] || [];
  const latestPrice = currentData.length > 0 ? currentData[currentData.length - 1] : null;
  const currentPrediction = predictions.find(p => p.asset === asset);

  // Calculate daily change
  const prevPrice = currentData.length > 1 ? currentData[currentData.length - 2] : null;
  const dailyChange = latestPrice && prevPrice
    ? ((latestPrice.inr_price_24k - prevPrice.inr_price_24k) / prevPrice.inr_price_24k * 100)
    : 0;

  return (
    <div className="app">
      {/* ─── Header ─── */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">Au</div>
            <div>
              <div className="header-title">Aurum AI</div>
              <div className="header-subtitle">Commodity Intelligence Engine</div>
            </div>
          </div>

          <div className="header-controls">
            <div className="header-status">
              <div className={`status-dot ${isOnline ? '' : 'offline'}`}></div>
              <span>{isOnline ? 'Live' : 'Offline'}</span>
            </div>
            <div className="asset-toggle" id="asset-toggle">
              <button
                className={`asset-toggle-btn ${asset === 'GOLD' ? 'active gold' : ''}`}
                onClick={() => setAsset('GOLD')}
                id="toggle-gold"
              >
                ◆ Gold
              </button>
              <button
                className={`asset-toggle-btn ${asset === 'SILVER' ? 'active silver' : ''}`}
                onClick={() => setAsset('SILVER')}
                id="toggle-silver"
              >
                ◇ Silver
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="main-content">
        {loading ? (
          <div className="spinner-container" style={{ minHeight: '60vh' }}>
            <div className="spinner"></div>
            <div className="spinner-text">Initializing Aurum AI Engine...</div>
          </div>
        ) : !isOnline ? (
          <div className="empty-state" style={{ minHeight: '60vh' }}>
            <div className="empty-state-icon">⚡</div>
            <div className="empty-state-text">Backend Offline</div>
            <div className="empty-state-sub">
              Start the FastAPI server: <code className="mono" style={{ color: 'var(--gold-400)' }}>uvicorn main:app --reload</code>
            </div>
          </div>
        ) : (
          <>
            {/* ─── Price Cards Row ─── */}
            {isGold ? (
              <div className="dashboard-grid animate-in">
                <PriceCard
                  label="24 Karat"
                  purity="24K"
                  inr={latestPrice?.inr_price_24k / 10}
                  usd={latestPrice?.usd_price}
                  accent={accentClass}
                  change={dailyChange}
                  delay={1}
                  unit="per gram"
                />
                <PriceCard
                  label="22 Karat"
                  purity="22K"
                  inr={latestPrice?.inr_price_22k / 10}
                  usd={null}
                  accent={accentClass}
                  change={dailyChange}
                  delay={2}
                  unit="per gram"
                />
                <PriceCard
                  label="18 Karat"
                  purity="18K"
                  inr={latestPrice?.inr_price_18k / 10}
                  usd={null}
                  accent={accentClass}
                  change={dailyChange}
                  delay={3}
                  unit="per gram"
                />
              </div>
            ) : (
              <div className="dashboard-grid animate-in">
                <PriceCard
                  label="1 Kilogram"
                  purity="999"
                  inr={latestPrice?.inr_price_24k * 100}
                  usd={latestPrice?.usd_price}
                  accent={accentClass}
                  change={dailyChange}
                  delay={1}
                  unit="per kg"
                />
                <PriceCard
                  label="100 Grams"
                  purity="999"
                  inr={latestPrice?.inr_price_24k * 10}
                  usd={null}
                  accent={accentClass}
                  change={dailyChange}
                  delay={2}
                  unit="per 100g"
                />
                <PriceCard
                  label="1 Gram"
                  purity="999"
                  inr={latestPrice?.inr_price_24k / 10}
                  usd={null}
                  accent={accentClass}
                  change={dailyChange}
                  delay={3}
                  unit="per gram"
                />
              </div>
            )}

            {/* ─── Chart ─── */}
            <div className={`chart-section glass-card ${accentClass}-accent animate-in animate-in-delay-2`}>
              <div className="chart-container">
                <div className="chart-header">
                  <div className="chart-title">
                    {isGold ? '🥇 GOLD / INR — Historical Price (per gram)' : '🥈 SILVER / INR — Historical Price (per kg)'}
                  </div>
                  <div className="chart-timeframes" id="timeframe-selector">
                    {TIMEFRAMES.map(tf => (
                      <button
                        key={tf}
                        className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
                        onClick={() => setTimeframe(tf)}
                        id={`tf-${tf}`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <PriceChart data={currentData} asset={asset} timeframe={timeframe} />
              </div>
            </div>

            {/* ─── Bottom Grid: Predictions + News ─── */}
            <div className="bottom-grid">
              {/* Predictions Panel */}
              <div className={`prediction-panel glass-card ${accentClass}-accent animate-in animate-in-delay-3`}>
                <div className="section-title">
                  🧠 AI Prediction Engine
                </div>
                {currentPrediction ? (
                  <>
                    <div className="prediction-row">
                      <span className="prediction-label">Current Reference (USD)</span>
                      <span className="prediction-value">{formatUSD(latestPrice?.usd_price)}</span>
                    </div>
                    <div className="prediction-row">
                      <span className="prediction-label">Predicted T+7 (USD)</span>
                      <span className="prediction-value">{formatUSD(currentPrediction.predicted_price)}</span>
                    </div>
                    <div className="prediction-row">
                      <span className="prediction-label">Confidence Range</span>
                      <span className="prediction-value" style={{ fontSize: '0.78rem' }}>
                        {formatUSD(currentPrediction.confidence_interval_low)} — {formatUSD(currentPrediction.confidence_interval_high)}
                      </span>
                    </div>
                    <div className="prediction-row">
                      <span className="prediction-label">Target Date</span>
                      <span className="prediction-value" style={{ color: 'var(--text-secondary)' }}>
                        {currentPrediction.target_date}
                      </span>
                    </div>

                    <RecommendationBadge rec={currentPrediction.recommendation} />

                    {/* Confidence Bar */}
                    <div className="confidence-bar-track">
                      <div
                        className={`confidence-bar-fill ${accentClass}`}
                        style={{
                          width: `${Math.min(
                            ((currentPrediction.predicted_price - currentPrediction.confidence_interval_low) /
                              (currentPrediction.confidence_interval_high - currentPrediction.confidence_interval_low)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="confidence-label">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔮</div>
                    <div className="empty-state-text">Awaiting prediction data</div>
                    <div className="empty-state-sub">The ML engine is processing. Check back soon.</div>
                  </div>
                )}
              </div>

              {/* News / Sentiment Feed */}
              <div className={`news-panel glass-card ${accentClass}-accent animate-in animate-in-delay-4`} id="news-feed">
                <div className="section-title">
                  📡 FinBERT Sentiment Feed
                </div>
                {news.length > 0 ? (
                  news.map((item, idx) => (
                    <div className="news-item" key={item.id || idx}>
                      <div className="news-item-header">
                        <div className="news-headline">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.headline}
                          </a>
                        </div>
                        <span className={`tag ${(item.label || '').toLowerCase()}`}>
                          {item.label || 'NEUTRAL'}
                        </span>
                      </div>
                      <div className="news-meta">
                        <span className="news-source">{item.source || 'Unknown'}</span>
                        <span>•</span>
                        <span>{timeAgo(item.published_at)}</span>
                        <span>•</span>
                        <span className={`sentiment-score ${
                          item.score > 0.1 ? 'positive' : item.score < -0.1 ? 'negative' : 'neutral-score'
                        }`}>
                          {item.score > 0 ? '+' : ''}{(item.score || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📰</div>
                    <div className="empty-state-text">No sentiment data yet</div>
                    <div className="empty-state-sub">The FinBERT NLP engine is scraping headlines.</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function PriceCard({ label, purity, inr, usd, accent, change, delay, unit }) {
  return (
    <div className={`price-card glass-card ${accent}-accent animate-in animate-in-delay-${delay}`} id={`card-${purity}`}>
      <div className="price-card-label">
        <span className="price-card-purity">{label}</span>
        <span className={`price-card-purity-badge ${accent}`}>{purity}</span>
      </div>
      <div className={`price-card-value ${accent}`}>
        {inr ? formatINR(inr) : '—'}
      </div>
      <div className="price-card-unit">
        {unit}
        {change !== 0 && (
          <span style={{
            marginLeft: 8,
            color: change >= 0 ? 'var(--green)' : 'var(--red)',
            fontWeight: 600,
            fontSize: '0.72rem',
          }}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      {usd && (
        <div className="price-card-usd">
          <span className="mono" style={{ color: 'var(--text-primary)' }}>{formatUSD(usd)}</span>
          <span style={{ marginLeft: 4 }}>/ oz (Spot)</span>
        </div>
      )}
    </div>
  );
}

function RecommendationBadge({ rec }) {
  if (!rec) return null;
  const key = rec.toLowerCase().replace(/\s+/g, '-');
  const icons = {
    'strong-buy': '🚀',
    'buy': '📈',
    'sell': '📉',
    'wait': '⏳',
  };
  return (
    <div className={`recommendation-badge ${key}`} id="recommendation-badge">
      <span>{icons[key] || '🔵'}</span>
      <span>{rec}</span>
    </div>
  );
}
