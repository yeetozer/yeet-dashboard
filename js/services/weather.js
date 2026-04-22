/* ===== WEATHER SERVICE ===== */

import { YEET } from '../config.js';
import { cacheGet, cacheSet, getWeatherEmoji, addLog } from '../utils/helpers.js';

export async function loadWeather() {
  const city = YEET.config.weatherCity || 'Istanbul';
  const cacheKey = `weather_${city}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    renderWeather(cached);
    return;
  }

  try {
    const simpleRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C|%t|%w|%h`);
    const simpleText = await simpleRes.text();
    const [condition, temp, wind, humidity] = simpleText.trim().split('|');

    const data = { condition, temp, wind, humidity };
    cacheSet(cacheKey, data, 300000); // Cache 5 min
    renderWeather(data);
  } catch (err) {
    console.error('Weather load failed:', err);
  }
}

function renderWeather({ condition, temp, wind, humidity }) {
  const mainEl = document.getElementById('weather-main');
  const tempEl = document.getElementById('weather-temp');
  const detailsEl = document.getElementById('weather-details');

  if (tempEl) tempEl.textContent = temp || '--°C';
  if (detailsEl) {
    detailsEl.innerHTML = `
      <div>${condition || 'Unknown'}</div>
      <div>💨 ${wind || '--'} | 💧 ${humidity || '--'}</div>
    `;
  }

  const detailedEl = document.getElementById('weather-detailed');
  if (detailedEl) {
    detailedEl.innerHTML = `
      <div class="weather-main">
        <span class="weather-icon">${getWeatherEmoji(condition)}</span>
        <span class="weather-temp">${temp || '--°C'}</span>
      </div>
      <div class="weather-details">
        <div><strong>${condition || 'Unknown'}</strong></div>
        <div>Wind: ${wind || '--'} | Humidity: ${humidity || '--'}</div>
      </div>
    `;
  }
}
