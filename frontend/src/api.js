// When running in Vite Dev, target the local backend port.
// When compiled for Production on Docker/Nginx, relative paths will map using Nginx reverse proxy routing.
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export async function fetchHistorical(asset, days = 730) {
  try {
    const res = await fetch(`${API_BASE}/api/historical/${asset}?days=${days}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[Aurum] Failed to fetch historical ${asset}:`, err);
    return [];
  }
}

export async function fetchPredictions() {
  try {
    const res = await fetch(`${API_BASE}/api/predictions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Aurum] Failed to fetch predictions:', err);
    return [];
  }
}

export async function fetchSentiment() {
  try {
    const res = await fetch(`${API_BASE}/api/sentiment`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Aurum] Failed to fetch sentiment:', err);
    return [];
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/`);
    return res.ok;
  } catch {
    return false;
  }
}
