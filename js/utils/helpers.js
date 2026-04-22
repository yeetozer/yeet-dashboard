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

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, options);
}

export function debounce(fn, wait = 250) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), wait);
  };
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
  if (gauge) gauge.style.setProperty('--value', `${percent}%`);
  if (value) value.textContent = `${percent}%`;
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
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function createModal(title, fields, onSubmit) {
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'presentation');

  const dialogTitleId = 'modal-title';

  const inputsHtml = fields.map(f => `
    <label for="${f.id}">${escapeHtml(f.label)}</label>
    ${f.type === 'textarea'
      ? `<textarea id="${f.id}" rows="3">${escapeHtml(f.value || '')}</textarea>`
      : `<input type="${f.type}" id="${f.id}" value="${escapeHtml(f.value || '')}">`
    }
  `).join('');

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${dialogTitleId}">
      <h3 id="${dialogTitleId}">${escapeHtml(title)}</h3>
      <div class="modal-form">
        ${inputsHtml}
      </div>
      <div class="modal-actions">
        <button class="btn" type="button" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" type="button" id="modal-confirm">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.querySelector('input, textarea')?.focus();
    overlay.classList.add('active');
  }, 10);

  document.getElementById('modal-confirm').addEventListener('click', () => {
    const values = {};
    fields.forEach(f => {
      values[f.id] = document.getElementById(f.id)?.value || '';
    });
    overlay.remove();
    onSubmit(values);
  });

  const esc = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

export function addLog(level, message) {
  if (typeof window.addLog === 'function') {
    window.addLog(level, message);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}
