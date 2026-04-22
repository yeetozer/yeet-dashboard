/* ===== HELPERS / UTILS ===== */

export function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h ${min % 60}m`;
  if (hr > 0) return `${hr}h ${min % 60}m ${sec % 60}s`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

export function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function getWeatherEmoji(condition) {
  const c = (condition || '').toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return '☀️';
  if (c.includes('cloud')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  return '⛅';
}

export function setGauge(gaugeId, valueId, percent) {
  const gauge = document.getElementById(gaugeId);
  const value = document.getElementById(valueId);
  if (gauge) gauge.style.setProperty('--value', percent);
  if (value) value.textContent = percent + '%';
}

/* ===== Simple Cache ===== */
const _cache = new Map();

export function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 30000) {
  if (_cache.size >= 50) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheClear() {
  _cache.clear();
}

/* ===== DOM Helpers ===== */
export function $(id) {
  return document.getElementById(id);
}

export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
