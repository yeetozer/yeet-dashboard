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
    renderCloudflareSummary(records);
    renderCloudflareRecords(records);
    addLog('info', `Loaded ${records.length} DNS records`);
  } catch (err) {
    renderCloudflareSummary([]);
    renderCloudflareRecordsError();
    addLog('error', `Cloudflare load failed: ${err.message}`);
  }
}

function renderCloudflareSummary(records) {
  const summary = document.getElementById('cloudflare-stats');
  if (!summary) return;

  const proxied = records.filter((record) => record.proxied).length;
  const direct = records.length - proxied;
  const uniqueTypes = new Set(records.map((record) => record.type)).size;

  summary.innerHTML = `
    <div class="stat-chip">
      <span>Total Records</span>
      <strong>${records.length}</strong>
    </div>
    <div class="stat-chip">
      <span>Proxied</span>
      <strong>${proxied}</strong>
    </div>
    <div class="stat-chip">
      <span>DNS Only</span>
      <strong>${direct}</strong>
    </div>
    <div class="stat-chip">
      <span>Record Types</span>
      <strong>${uniqueTypes}</strong>
    </div>
  `;
}

function renderCloudflareRecords(records) {
  const container = document.getElementById('cloudflare-records');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-state">No DNS records returned.</p>';
    return;
  }

  container.innerHTML = `
    <div class="cf-record-grid">
      ${records.map((record) => `
        <article class="cf-record">
          <div class="cf-record-top">
            <span class="cf-type">${escapeHtml(record.type)}</span>
            <span class="cf-proxied ${record.proxied ? 'proxied' : 'direct'}">
              ${record.proxied ? 'Proxied' : 'DNS only'}
            </span>
          </div>
          <div class="cf-name">${escapeHtml(record.name)}</div>
          <div class="cf-content">${escapeHtml(record.content)}</div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderCloudflareRecordsError() {
  const container = document.getElementById('cloudflare-records');
  if (!container) return;
  container.innerHTML = '<div class="inline-alert error">Cloudflare data is unavailable through the proxy.</div>';
}
