/* ===== CLOUDFLARE SERVICE ===== */

import { CLOUDFLARE, API_BASE } from '../config.js';
import { cacheGet, cacheSet, escapeHtml, addLog } from '../utils/helpers.js';

export function setCloudflareConfig(token, zoneId) {
  CLOUDFLARE.token = token;
  CLOUDFLARE.zoneId = zoneId;
}

export async function fetchCloudflare(endpoint) {
  const cacheKey = `cf_${endpoint}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_BASE.cloudflare}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE.token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message}`);

  cacheSet(cacheKey, data.result, 60000);
  return data.result;
}

export async function loadCloudflareData() {
  try {
    if (!CLOUDFLARE.token) {
      addLog('warn', 'Cloudflare token not configured');
      return;
    }
    const records = await fetchCloudflare(`/zones/${CLOUDFLARE.zoneId}/dns_records?per_page=100`);
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
