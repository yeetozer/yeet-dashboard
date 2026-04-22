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
    renderDokploySummary(projects);
    renderDokployProjects(projects);
    addLog('info', `Loaded ${projects.length} Dokploy projects`);
  } catch (err) {
    renderDokploySummary([]);
    renderDokployError();
    addLog('error', `Dokploy load failed: ${err.message}`);
  }
}

function renderDokploySummary(projects) {
  const summary = document.getElementById('dokploy-stats');
  if (!summary) return;

  const totals = projects.reduce((acc, project) => {
    const env = project.environments?.[0] || {};
    acc.apps += env.applications?.length || 0;
    acc.databases +=
      (env.postgres?.length || 0) +
      (env.mysql?.length || 0) +
      (env.mariadb?.length || 0) +
      (env.mongo?.length || 0) +
      (env.redis?.length || 0);
    return acc;
  }, { apps: 0, databases: 0 });

  const activeProjects = projects.filter((project) => (project.environments?.[0]?.applications?.length || 0) > 0).length;

  summary.innerHTML = `
    <div class="stat-chip">
      <span>Projects</span>
      <strong>${projects.length}</strong>
    </div>
    <div class="stat-chip">
      <span>Active</span>
      <strong>${activeProjects}</strong>
    </div>
    <div class="stat-chip">
      <span>Apps</span>
      <strong>${totals.apps}</strong>
    </div>
    <div class="stat-chip">
      <span>Databases</span>
      <strong>${totals.databases}</strong>
    </div>
  `;
}

function renderDokployProjects(projects) {
  const container = document.getElementById('dokploy-projects');
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = '<p class="empty-state">No Dokploy projects returned.</p>';
    return;
  }

  container.innerHTML = projects.map((project) => {
    const env = project.environments?.[0] || {};
    const apps = env.applications?.length || 0;
    const databases =
      (env.postgres?.length || 0) +
      (env.mysql?.length || 0) +
      (env.mariadb?.length || 0) +
      (env.mongo?.length || 0) +
      (env.redis?.length || 0);
    const environments = project.environments?.length || 0;
    const active = apps > 0;

    return `
      <article class="dokploy-project">
        <div class="dp-header">
          <div>
            <span class="dp-kicker">Dokploy Project</span>
            <span class="dp-name">${escapeHtml(project.name)}</span>
          </div>
          <span class="dp-status ${active ? 'active' : 'empty'}">${active ? 'Active' : 'Idle'}</span>
        </div>
        <div class="dp-meta-grid">
          <div class="dp-stat">
            <span>Environments</span>
            <strong>${environments}</strong>
          </div>
          <div class="dp-stat">
            <span>Apps</span>
            <strong>${apps}</strong>
          </div>
          <div class="dp-stat">
            <span>Databases</span>
            <strong>${databases}</strong>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderDokployError() {
  const container = document.getElementById('dokploy-projects');
  if (!container) return;
  container.innerHTML = '<div class="inline-alert error">Dokploy data is unavailable through the proxy.</div>';
}
