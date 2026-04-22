/* ===== DOKPLOY SERVICE ===== */

import { API_BASE } from '../config.js';
import { cacheGet, cacheSet, escapeHtml, addLog } from '../utils/helpers.js';

export async function fetchDokployProjects() {
  const cacheKey = 'dk_projects';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(API_BASE.dokployProjects, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Dokploy API error: ${res.status}`);
  }

  const data = await res.json();
  cacheSet(cacheKey, data, 30000);
  return data;
}

export async function loadDokployData() {
  try {
    const projects = await fetchDokployProjects();
    renderDokployProjects(projects);
    addLog('info', `Loaded ${projects.length} Dokploy projects`);
  } catch (err) {
    addLog('error', `Dokploy load failed: ${err.message}`);
  }
}

function renderDokployProjects(projects) {
  const container = document.getElementById('dokploy-projects');
  if (!container) return;

  container.innerHTML = projects.map(p => {
    const env = p.environments?.[0] || {};
    const apps = env.applications?.length || 0;
    const dbs = (env.postgres?.length || 0) + (env.mysql?.length || 0) + (env.mariadb?.length || 0) + (env.mongo?.length || 0) + (env.redis?.length || 0);

    return `
      <div class="dokploy-project">
        <div class="dp-header">
          <span class="dp-name">${escapeHtml(p.name)}</span>
          <span class="dp-status ${apps > 0 ? 'active' : 'empty'}">${apps > 0 ? '● Active' : '○ Empty'}</span>
        </div>
        <div class="dp-meta">
          <span>🚀 ${apps} apps</span>
          <span>🗄️ ${dbs} databases</span>
        </div>
      </div>
    `;
  }).join('');
}
