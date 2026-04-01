import { useEffect, useRef } from 'react';
import { createChart, AreaSeries, LineSeries, ColorType, CrosshairMode } from 'lightweight-charts';

export default function PriceChart({ data, asset, timeframe }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const isGold = asset === 'GOLD';
    const accentColor = isGold ? '#D4AF37' : '#C0C0C0';
    const gradientTop = isGold ? 'rgba(212, 175, 55, 0.28)' : 'rgba(192, 192, 192, 0.2)';
    const gradientBottom = isGold ? 'rgba(212, 175, 55, 0.0)' : 'rgba(192, 192, 192, 0.0)';

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8888a8',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
          style: 2,
          labelBackgroundColor: isGold ? '#b8860b' : '#6a6a7d',
        },
        horzLine: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
          style: 2,
          labelBackgroundColor: isGold ? '#b8860b' : '#6a6a7d',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Area Series for INR 24K price
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: gradientTop,
      bottomColor: gradientBottom,
      lineColor: accentColor,
      lineWidth: 2,
      crosshairMarkerBackgroundColor: accentColor,
      crosshairMarkerRadius: 4,
      priceFormat: { type: 'custom', formatter: (p) => '₹' + p.toLocaleString('en-IN', { maximumFractionDigits: 0 }) },
    });

    // Filter data by timeframe
    const filteredData = filterByTimeframe(data, timeframe);

    const chartData = filteredData
      .filter(d => d.inr_price_24k && d.date)
      .map(d => ({
        time: d.date,
        value: d.inr_price_24k,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    areaSeries.setData(chartData);

    // SMA overlay
    if (chartData.length > 20) {
      const smaData = calculateSMA(chartData, 20);
      const smaSeries = chart.addSeries(LineSeries, {
        color: isGold ? 'rgba(255, 202, 40, 0.4)' : 'rgba(160, 160, 176, 0.4)',
        lineWidth: 1,
        lineStyle: 2,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      smaSeries.setData(smaData);
    }

    chart.timeScale().fitContent();

    // Responsive resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, asset, timeframe]);

  return <div ref={chartContainerRef} className="chart-wrapper" />;
}

function filterByTimeframe(data, tf) {
  if (!tf || tf === 'ALL') return data;
  const now = new Date();
  const daysMap = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730 };
  const days = daysMap[tf] || 730;
  const cutoff = new Date(now.getTime() - days * 86400000);
  return data.filter(d => new Date(d.date) >= cutoff);
}

function calculateSMA(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].value;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}
