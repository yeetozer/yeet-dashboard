/* ===== CLOUDFLARE SERVICE ===== */

import { API_BASE } from '../config.js';
import { cacheGet, cacheSet, escapeHtml, addLog } from '../utils/helpers.js';

export async function fetchCloudflareDns() {
  const cacheKey = 'cf_dns_records';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(API_BASE.cloudflareDns, {
    headers: {
      accept: 'application/json'
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Cloudflare API error: ${res.status}`);
  }

  const data = await res.json();
  cacheSet(cacheKey, data, 60000);
  return data;
}

export async function loadCloudflareData() {
  try {
    const records = await fetchCloudflareDns();
    renderCloudflareRecords(records);
    addLog('info', `Loaded ${records.length} DNS records`);
  } catch (err) {
    addLog('error', `Cloudflare load failed: ${err.message}`);
  }
}

function renderCloudflareRecords(records) {
  const container = document.getElementById('cloudflare-records');
  if (!container) return;

  container.innerHTML = records.map(r => {
    const proxied = r.proxied ? '🟡' : '⚫';
    return `
      <div class="cf-record">
        <span class="cf-type">${r.type}</span>
        <span class="cf-name">${escapeHtml(r.name)}</span>
        <span class="cf-content">${escapeHtml(r.content)}</span>
        <span class="cf-proxied">${proxied}</span>
      </div>
    `;
  }).join('');
}
