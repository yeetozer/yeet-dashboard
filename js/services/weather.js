/* ===== WEATHER SERVICE ===== */

import { YEET } from '../config.js';
import { cacheGet, cacheSet, getWeatherEmoji, escapeHtml, addLog } from '../utils/helpers.js';

export async function loadWeather() {
  const city = YEET.config.weatherCity || 'Istanbul';
  const cacheKey = `weather_${city}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    renderWeather(cached, city);
    return;
  }

  try {
    const simpleRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C|%t|%w|%h`);
    const simpleText = await simpleRes.text();
    const [condition, temp, wind, humidity] = simpleText.trim().split('|');

    const data = { condition, temp, wind, humidity };
    cacheSet(cacheKey, data, 300000);
    renderWeather(data, city);
  } catch (err) {
    renderWeatherError(city);
    addLog('error', `Weather load failed: ${err.message}`);
  }
}

function renderWeather({ condition, temp, wind, humidity }, city) {
  const icon = getWeatherEmoji(condition);
  const mainEl = document.getElementById('weather-main');
  const detailsEl = document.getElementById('weather-details');
  const detailedEl = document.getElementById('weather-detailed');
  const cityLabel = document.getElementById('weather-loc');

  if (cityLabel) cityLabel.textContent = city;

  if (mainEl) {
    mainEl.innerHTML = `
      <div class="weather-main-stack">
        <span class="weather-icon" aria-hidden="true">${icon}</span>
        <div class="weather-stack-copy">
          <span class="weather-temp">${temp || '--°C'}</span>
          <span class="weather-condition">${escapeHtml(condition || 'Unknown conditions')}</span>
        </div>
      </div>
    `;
  }

  if (detailsEl) {
    detailsEl.innerHTML = `
      <div class="weather-detail-pill">
        <span>Wind</span>
        <strong>${escapeHtml(wind || '--')}</strong>
      </div>
      <div class="weather-detail-pill">
        <span>Humidity</span>
        <strong>${escapeHtml(humidity || '--')}</strong>
      </div>
    `;
  }

  if (detailedEl) {
    detailedEl.innerHTML = `
      <div class="weather-detailed-grid">
        <div class="weather-detailed-main">
          <span class="weather-icon" aria-hidden="true">${icon}</span>
          <div>
            <div class="weather-temp">${temp || '--°C'}</div>
            <div class="weather-condition">${escapeHtml(condition || 'Unknown')}</div>
          </div>
        </div>
        <div class="weather-detail-matrix">
          <div class="weather-detail-card">
            <span>City</span>
            <strong>${escapeHtml(city)}</strong>
          </div>
          <div class="weather-detail-card">
            <span>Wind</span>
            <strong>${escapeHtml(wind || '--')}</strong>
          </div>
          <div class="weather-detail-card">
            <span>Humidity</span>
            <strong>${escapeHtml(humidity || '--')}</strong>
          </div>
          <div class="weather-detail-card">
            <span>Condition</span>
            <strong>${escapeHtml(condition || 'Unknown')}</strong>
          </div>
        </div>
      </div>
    `;
  }
}

function renderWeatherError(city) {
  const detailsEl = document.getElementById('weather-details');
  const detailedEl = document.getElementById('weather-detailed');
  const mainEl = document.getElementById('weather-main');
  const cityLabel = document.getElementById('weather-loc');

  if (cityLabel) cityLabel.textContent = city;

  if (mainEl) {
    mainEl.innerHTML = `
      <div class="weather-main-stack">
        <span class="weather-icon" aria-hidden="true">🌫️</span>
        <div class="weather-stack-copy">
          <span class="weather-temp">--</span>
          <span class="weather-condition">Weather unavailable</span>
        </div>
      </div>
    `;
  }

  if (detailsEl) {
    detailsEl.innerHTML = '<div class="inline-alert error">Unable to fetch current weather.</div>';
  }

  if (detailedEl) {
    detailedEl.innerHTML = '<div class="inline-alert error">Weather feed is currently unavailable.</div>';
  }
}
