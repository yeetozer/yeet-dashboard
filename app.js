/** Yeet Dashboard - Mission Control */

'use strict';

import { YEET } from './js/config.js';
import {
  formatDuration,
  truncate,
  escapeHtml,
  setGauge,
  showToast,
  cacheClear,
  addLog
} from './js/utils/helpers.js';
import { initTerminal } from './js/components/terminal.js';
import { loadSystemMetrics } from './js/services/system.js';
import { loadDokployData } from './js/services/dokploy.js';
import { loadCloudflareData } from './js/services/cloudflare.js';
import { loadWeather } from './js/services/weather.js';
import { initProjects, updateProjectMetrics } from './js/services/projects.js';

document.addEventListener('DOMContentLoaded', async () => {
  YEET.state.currentTab = 'overview';
  YEET.state.logFilter = '';

  document.addEventListener('projects-updated', () => {
    renderProjectOverview();
  });

  initTabs();
  initJumpButtons();
  initSettings();
  await loadProxySettingsStatus();
  await initProjects();
  initDaily();
  initLogs();
  initTerminal();
  detectSystem();
  syncConfigIndicators();
  renderMissionSnapshot([]);
  renderProjectOverview();
  renderAlertFeed();

  await Promise.all([
    loadWorkspaceData(),
    loadSystemMetrics(),
    loadDokployData(),
    loadCloudflareData(),
    loadWeather()
  ]);

  updateProjectMetrics();
  renderProjectOverview();
  checkNetworkStatus();
  startAutoRefresh();
  startClock();
});

function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const longTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const longDate = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const shortDate = now.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric'
  });

  setText('clock-time', longTime);
  setText('clock-date', longDate);
  setText('header-time', longTime);
  setText('header-date', shortDate);
  updateGreeting(now);
}

function updateGreeting(now) {
  const hour = now.getHours();
  const greetingEl = document.getElementById('greeting');
  if (!greetingEl) return;

  const name = YEET.config.userName || 'friend';
  let greeting = 'Hello';

  if (hour < 6) greeting = 'Good night';
  else if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';

  greetingEl.textContent = `${greeting}, ${name}.`;
}

function initTabs() {
  document.querySelectorAll('.nav-tab[data-tab], .submenu-item[data-tab]').forEach((trigger) => {
    trigger.addEventListener('click', () => activateTab(trigger.dataset.tab));
  });

  activateTab(document.querySelector('.nav-tab.active')?.dataset.tab || 'overview');
}

function initJumpButtons() {
  document.querySelectorAll('[data-jump-tab]').forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.jumpTab));
  });
}

function activateTab(target) {
  const panel = document.getElementById(target);
  if (!panel) return;

  YEET.state.currentTab = target;

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === target);
  });

  document.querySelectorAll('.nav-tab[data-tab], .submenu-item[data-tab]').forEach((trigger) => {
    const isActive = trigger.dataset.tab === target;
    trigger.classList.toggle('active', isActive);
    trigger.setAttribute('aria-selected', String(isActive));
  });

  const servicesTrigger = document.querySelector('.nav-tab[data-tab="services"]');
  if (servicesTrigger) {
    const serviceChildActive = target === 'cloudflare' || target === 'dokploy';
    servicesTrigger.classList.toggle('active-parent', serviceChildActive);
  }

  const activeTrigger = document.querySelector(`.nav-tab[data-tab="${target}"], .submenu-item[data-tab="${target}"]`);
  updatePageCopy(activeTrigger, target);

  if (target === 'terminal') {
    window.requestAnimationFrame(() => {
      document.getElementById('terminal-input')?.focus();
    });
  }
}

function updatePageCopy(trigger, target) {
  const title = trigger?.dataset.title || titleCase(target);
  const description = trigger?.dataset.description || 'Operational dashboard section';
  setText('page-title', title);
  setText('page-description', description);
}

function initSettings() {
  const refreshSelect = document.getElementById('refresh-interval');
  const autoCheckbox = document.getElementById('auto-refresh');
  const weatherCityInput = document.getElementById('weather-city');
  const userNameInput = document.getElementById('user-name');
  const dokployUrlInput = document.getElementById('dokploy-url');
  const dokployApiKeyInput = document.getElementById('dokploy-api-key');
  const cloudflareTokenInput = document.getElementById('cloudflare-token');
  const cloudflareZoneIdInput = document.getElementById('cloudflare-zone-id');
  const apiForm = document.getElementById('api-settings-form');
  const testButton = document.getElementById('test-api-connection');

  const saved = localStorage.getItem('yeet-dashboard');
  if (saved) {
    const parsed = JSON.parse(saved);
    YEET.config = {
      ...YEET.config,
      ...parsed,
      apiSettings: {
        ...YEET.config.apiSettings,
        ...(parsed.apiSettings || {})
      }
    };
  }

  if (refreshSelect) refreshSelect.value = String(YEET.config.refreshInterval / 1000);
  if (autoCheckbox) autoCheckbox.checked = YEET.config.autoRefresh;
  if (weatherCityInput) weatherCityInput.value = YEET.config.weatherCity;
  if (userNameInput) userNameInput.value = YEET.config.userName;
  if (dokployUrlInput) dokployUrlInput.value = YEET.config.apiSettings.dokployUrl || '';
  if (dokployApiKeyInput) dokployApiKeyInput.value = YEET.config.apiSettings.dokployApiKey || '';
  if (cloudflareTokenInput) cloudflareTokenInput.value = YEET.config.apiSettings.cloudflareToken || '';
  if (cloudflareZoneIdInput) cloudflareZoneIdInput.value = YEET.config.apiSettings.cloudflareZoneId || '';

  syncConfigIndicators();
  updateGreeting(new Date());
  updateConnectionStatus('dokploy', 'disconnected', 'Not connected');
  updateConnectionStatus('cloudflare', 'disconnected', 'Not connected');

  refreshSelect?.addEventListener('change', () => {
    YEET.config.refreshInterval = parseInt(refreshSelect.value, 10) * 1000;
    saveConfig();
    restartAutoRefresh();
    syncConfigIndicators();
  });

  autoCheckbox?.addEventListener('change', () => {
    YEET.config.autoRefresh = autoCheckbox.checked;
    saveConfig();
    if (YEET.config.autoRefresh) startAutoRefresh();
    else stopAutoRefresh();
    syncConfigIndicators();
  });

  weatherCityInput?.addEventListener('change', () => {
    YEET.config.weatherCity = weatherCityInput.value || 'Istanbul';
    saveConfig();
    syncConfigIndicators();
    loadWeather();
  });

  userNameInput?.addEventListener('change', () => {
    YEET.config.userName = userNameInput.value || 'friend';
    saveConfig();
    updateGreeting(new Date());
  });

  apiForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    YEET.config.apiSettings = {
      dokployUrl: dokployUrlInput?.value.trim() || '',
      dokployApiKey: dokployApiKeyInput?.value.trim() || '',
      cloudflareToken: cloudflareTokenInput?.value.trim() || '',
      cloudflareZoneId: cloudflareZoneIdInput?.value.trim() || ''
    };

    saveConfig();
    await pushApiSettings();
  });

  testButton?.addEventListener('click', async () => {
    YEET.config.apiSettings = {
      dokployUrl: dokployUrlInput?.value.trim() || '',
      dokployApiKey: dokployApiKeyInput?.value.trim() || '',
      cloudflareToken: cloudflareTokenInput?.value.trim() || '',
      cloudflareZoneId: cloudflareZoneIdInput?.value.trim() || ''
    };

    saveConfig();
    await pushApiSettings({ silentSuccess: true });
    await testApiConnections();
  });

  document.getElementById('refresh-btn')?.addEventListener('click', async () => {
    cacheClear();
    await Promise.all([
      loadWorkspaceData(),
      loadSystemMetrics(),
      loadDokployData(),
      loadCloudflareData(),
      loadWeather()
    ]);
    updateProjectMetrics();
    renderProjectOverview();
    checkNetworkStatus();
    showToast('Dashboard refreshed', 'success');
  });
}

function saveConfig() {
  localStorage.setItem('yeet-dashboard', JSON.stringify({
    refreshInterval: YEET.config.refreshInterval,
    autoRefresh: YEET.config.autoRefresh,
    weatherCity: YEET.config.weatherCity,
    userName: YEET.config.userName,
    apiSettings: YEET.config.apiSettings,
    focus: YEET.config.focus,
    todos: YEET.config.todos,
    bookmarks: YEET.config.bookmarks,
    projects: YEET.config.projects
  }));
}

async function pushApiSettings(options = {}) {
  const feedback = document.getElementById('api-settings-feedback');

  try {
    setSettingsFeedback('Saving API settings...', 'info');
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify(YEET.config.apiSettings)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save API settings');
    }

    if (!options.silentSuccess) {
      setSettingsFeedback('API settings saved to the local proxy config.', 'success');
      showToast('API settings saved', 'success');
    } else if (feedback) {
      setSettingsFeedback('API settings synced. Ready to test connections.', 'info');
    }

    syncProxyConfigStatus(data);
    return true;
  } catch (error) {
    setSettingsFeedback(`Failed to save settings: ${error.message}`, 'error');
    showToast('Could not save API settings', 'error');
    return false;
  }
}

async function loadProxySettingsStatus() {
  try {
    const response = await fetch('/api/settings', {
      headers: { accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to load proxy settings');
    syncProxyConfigStatus(data);
  } catch (error) {
    addLog('warn', `Settings status unavailable: ${error.message}`);
  }
}

async function testApiConnections() {
  setSettingsFeedback('Testing Dokploy and Cloudflare connections...', 'info');
  updateConnectionStatus('dokploy', 'pending', 'Testing connection...');
  updateConnectionStatus('cloudflare', 'pending', 'Testing connection...');

  const checks = await Promise.allSettled([
    fetch('/api/dokploy/projects', { headers: { accept: 'application/json' } }),
    fetch('/api/cloudflare/dns', { headers: { accept: 'application/json' } })
  ]);

  const [dokployResult, cloudflareResult] = checks;
  const dokployOk = await handleConnectionResult(dokployResult, 'dokploy', 'Dokploy');
  const cloudflareOk = await handleConnectionResult(cloudflareResult, 'cloudflare', 'Cloudflare');

  const badge = document.getElementById('settings-connection-badge');
  if (dokployOk && cloudflareOk) {
    badge?.classList.remove('badge-warning');
    badge?.classList.add('badge-success');
    if (badge) badge.textContent = 'Connected';
    setSettingsFeedback('Both services responded successfully.', 'success');
    showToast('Connections look good', 'success');
  } else {
    badge?.classList.remove('badge-success');
    badge?.classList.add('badge-warning');
    if (badge) badge.textContent = 'Needs Attention';
    setSettingsFeedback('One or more service checks failed. Review the connection indicators below.', 'error');
    showToast('Connection test finished with errors', 'error');
  }
}

async function handleConnectionResult(result, serviceKey, label) {
  if (result.status !== 'fulfilled') {
    updateConnectionStatus(serviceKey, 'disconnected', `${label} request failed`);
    return false;
  }

  const response = result.value;
  if (response.ok) {
    updateConnectionStatus(serviceKey, 'connected', `${label} connected`);
    return true;
  }

  const data = await response.json().catch(() => ({}));
  updateConnectionStatus(serviceKey, 'disconnected', data.error || `${label} error (${response.status})`);
  return false;
}

function syncProxyConfigStatus(data) {
  const badge = document.getElementById('settings-connection-badge');
  const configured = data?.configured || {};
  const hasDokploy = Boolean(configured.dokploy);
  const hasCloudflare = Boolean(configured.cloudflare);
  const allConfigured = hasDokploy && hasCloudflare;
  const anyConfigured = hasDokploy || hasCloudflare;

  if (badge) {
    badge.classList.remove('badge-success', 'badge-warning', 'badge-info');
    badge.classList.add(allConfigured ? 'badge-info' : 'badge-warning');
    badge.textContent = allConfigured ? 'Configured' : anyConfigured ? 'Partial' : 'Disconnected';
  }
}

function updateConnectionStatus(service, state, message) {
  const card = document.getElementById(`${service}-connection-status`);
  const text = document.getElementById(`${service}-connection-text`);
  if (!card || !text) return;

  card.classList.remove('connected', 'disconnected', 'pending');
  card.classList.add(state);
  text.textContent = message;
}

function setSettingsFeedback(message, type = 'info') {
  const feedback = document.getElementById('api-settings-feedback');
  if (!feedback) return;

  feedback.classList.remove('error', 'success');
  if (type === 'error' || type === 'success') {
    feedback.classList.add(type);
  }
  feedback.textContent = message;
}

function syncConfigIndicators() {
  const city = YEET.config.weatherCity || 'Istanbul';
  const refreshText = YEET.config.autoRefresh
    ? `${YEET.config.refreshInterval / 1000}s auto`
    : 'Manual';

  setText('weather-loc', city);
  setText('refresh-cycle', refreshText);
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!YEET.config.autoRefresh) return;

  YEET.state.timerId = setInterval(() => {
    Promise.all([
      loadWorkspaceData(),
      loadSystemMetrics(),
      loadDokployData(),
      loadCloudflareData()
    ]);
    updateProjectMetrics();
    renderProjectOverview();
    checkNetworkStatus();
  }, YEET.config.refreshInterval);
}

function stopAutoRefresh() {
  if (YEET.state.timerId) {
    clearInterval(YEET.state.timerId);
    YEET.state.timerId = null;
  }
}

function restartAutoRefresh() {
  startAutoRefresh();
}

async function loadWorkspaceData() {
  try {
    const [wsState, sessionFiles] = await Promise.all([
      fetchJson('../.openclaw/workspace-state.json').catch(() => null),
      discoverSessions()
    ]);

    if (wsState) renderWorkspaceState(wsState);

    YEET.config.sessionFiles = sessionFiles;
    const sessions = [];
    await Promise.all(
      YEET.config.sessionFiles.slice(0, 10).map(async (file) => {
        try {
          const session = await fetchJson(`../state/sessions/${encodeURIComponent(file)}`);
          sessions.push(session);
        } catch (error) {
          return null;
        }
        return null;
      })
    );

    renderSessions(sessions);
    renderSystem(sessions);
    renderMissionSnapshot(sessions);
    renderProjectOverview();

    YEET.state.lastUpdate = new Date();
    const updateTime = YEET.state.lastUpdate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    setText('last-updated', updateTime);
    setText('projects-last-sync', updateTime);

    addLog('info', `Dashboard refreshed. ${sessions.length} sessions loaded.`);
  } catch (err) {
    addLog('error', `Refresh failed: ${err.message}`);
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function discoverSessions() {
  try {
    const res = await fetch('../state/sessions/');
    if (res.ok) {
      const text = await res.text();
      const files = [];
      const regex = /href="([^"]+\.json)"/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        files.push(decodeURIComponent(match[1]));
      }
      return files;
    }
  } catch (error) {
    return ['agent:codex:acp:8e648301-4795-4c10-bc19-4a1fce4a68a5.json'];
  }

  return ['agent:codex:acp:8e648301-4795-4c10-bc19-4a1fce4a68a5.json'];
}

function renderWorkspaceState(state) {
  const bootTime = state?.bootstrapSeededAt ? new Date(state.bootstrapSeededAt) : null;
  if (!bootTime) return;
  const uptime = Date.now() - bootTime.getTime();
  setText('uptime', formatDuration(uptime));
}

function renderSessions(sessions) {
  const container = document.getElementById('sessions-list');
  const countEl = document.getElementById('session-count');
  const active = sessions.filter((session) => !session.closed);

  if (countEl) countEl.textContent = String(active.length);
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state compact">No sessions found. The gateway is idle.</p>';
    renderModels([]);
    renderTokenBars([]);
    return;
  }

  const orderedSessions = [...sessions].sort((a, b) => Number(Boolean(a.closed)) - Number(Boolean(b.closed)));
  container.innerHTML = orderedSessions.slice(0, 6).map((session) => {
    const name = session.name || session.acpx_record_id || 'Unknown';
    const isActive = !session.closed;
    const agent = session.agent_command || 'No agent command';
    const created = session.created_at ? new Date(session.created_at).toLocaleString() : 'Unknown time';

    return `
      <article class="session-item">
        <div class="session-mark" aria-hidden="true">${isActive ? '●' : '○'}</div>
        <div class="session-info">
          <div class="session-name" title="${escapeHtml(name)}">${truncate(name, 38)}</div>
          <div class="session-meta">
            <span>${truncate(agent, 42)}</span>
            <span>${created}</span>
          </div>
        </div>
        <span class="session-status ${isActive ? 'active' : 'closed'}">
          ${isActive ? 'Active' : 'Closed'}
        </span>
      </article>
    `;
  }).join('');

  renderModels(sessions);
  renderTokenBars(sessions);
}

function getSessionModels(sessions) {
  const models = new Map();
  sessions.forEach((session) => {
    const name = session.model || 'ollama/kimi-k2.6:cloud';
    if (!models.has(name)) {
      models.set(name, { name, activeSessions: session.closed ? 0 : 1 });
    } else if (!session.closed) {
      models.get(name).activeSessions += 1;
    }
  });

  return models;
}

function renderModels(sessions) {
  const models = getSessionModels(sessions);
  const displayModels = models.size > 0
    ? models
    : new Map([['ollama/kimi-k2.6:cloud', { name: 'ollama/kimi-k2.6:cloud', activeSessions: 0 }]]);
  const container = document.getElementById('models-list');
  if (!container) return;

  container.innerHTML = Array.from(displayModels.values()).map((model) => `
    <div class="model-item">
      <div class="model-copy">
        <span class="model-name">${escapeHtml(model.name)}</span>
        <span class="model-meta">${model.activeSessions} active session${model.activeSessions === 1 ? '' : 's'}</span>
      </div>
      <span class="model-status ${model.activeSessions > 0 ? 'active' : ''}">
        ${model.activeSessions > 0 ? 'Online' : 'Idle'}
      </span>
    </div>
  `).join('');

  setText('model-count', String(models.size));
}

function renderTokenBars(sessions) {
  const container = document.getElementById('token-bars');
  if (!container) return;

  const data = sessions.slice(0, 5).map((session, index) => {
    const name = (session.name || `Session ${index + 1}`).replace(/^agent:/, '');
    const usage = pseudoMetric(`${name}:${index}`, 18, 88);
    const tier = usage > 72 ? 'High' : usage > 45 ? 'Moderate' : 'Low';
    const color = usage > 72
      ? 'var(--accent-red)'
      : usage > 45
        ? 'var(--accent-yellow)'
        : 'var(--accent-green)';

    return { name: truncate(name, 24), usage, tier, color };
  });

  if (data.length === 0) {
    container.innerHTML = '<p class="empty-state compact">No token telemetry available.</p>';
    return;
  }

  container.innerHTML = data.map((item) => `
    <div class="token-bar-item">
      <div class="token-bar-copy">
        <span class="token-bar-label" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="token-bar-tier">${item.tier}</span>
      </div>
      <div class="token-bar-track">
        <div class="token-bar-fill" style="width: ${item.usage}%; background: ${item.color};"></div>
      </div>
      <span class="token-bar-value">${item.usage}%</span>
    </div>
  `).join('');
}

function renderSystem(sessions) {
  const activeCount = sessions.filter((session) => !session.closed).length;
  const cpuVal = Math.min(activeCount * 15 + Math.floor(Math.random() * 10), 100);
  const memVal = Math.min(20 + activeCount * 12 + Math.floor(Math.random() * 15), 95);
  const diskVal = Math.floor(Math.random() * 20) + 40;

  setGauge('cpu-gauge', 'cpu-value', cpuVal);
  setGauge('memory-gauge', 'memory-value', memVal);
  setGauge('disk-gauge', 'disk-value', diskVal);

  setText('memory-details', `${(memVal * 0.16).toFixed(1)} / 16.0 GB`);
  setText('disk-details', `${(diskVal * 0.5).toFixed(1)} / 500 GB`);
}

function renderMissionSnapshot(sessions) {
  const activeSessions = sessions.filter((session) => !session.closed).length;
  const modelCount = getSessionModels(sessions).size;
  const runningProjects = YEET.config.projects.filter((project) => project.status === 'running').length;
  const totalProjects = YEET.config.projects.length;

  setText('summary-active-sessions', String(activeSessions));
  setText('summary-model-count', String(modelCount));
  setText('summary-running-projects', String(runningProjects));
  setText('summary-total-projects', String(totalProjects));
  setText('overview-project-count', String(totalProjects));
  updateAlertCount();
}

function renderProjectOverview() {
  const overview = document.getElementById('project-overview-list');
  const running = YEET.config.projects.filter((project) => project.status === 'running');
  const stopped = YEET.config.projects.filter((project) => project.status !== 'running');
  const dirty = YEET.config.projects.filter((project) => project.gitStatus && project.gitStatus !== 'clean');
  const topProjects = [...YEET.config.projects].sort((a, b) => {
    const aScore = a.status === 'running' ? 0 : 1;
    const bScore = b.status === 'running' ? 0 : 1;
    return aScore - bScore;
  }).slice(0, 4);

  setText('projects-running-count', String(running.length));
  setText('projects-stopped-count', String(stopped.length));
  setText('projects-dirty-count', String(dirty.length));
  setText('overview-project-count', String(YEET.config.projects.length));
  setText('summary-running-projects', String(running.length));
  setText('summary-total-projects', String(YEET.config.projects.length));

  if (!overview) return;

  if (topProjects.length === 0) {
    overview.innerHTML = '<p class="empty-state compact">No projects tracked yet.</p>';
    return;
  }

  overview.innerHTML = topProjects.map((project) => {
    const runningState = project.status === 'running';
    return `
      <article class="overview-project-item">
        <div class="overview-project-copy">
          <strong>${escapeHtml(project.name)}</strong>
          <span>${truncate(project.description || project.path || 'No description', 46)}</span>
        </div>
        <div class="overview-project-state ${runningState ? 'running' : 'stopped'}">
          <span class="state-dot" aria-hidden="true"></span>
          <span>${runningState ? 'Running' : 'Stopped'}</span>
        </div>
      </article>
    `;
  }).join('');
}

function initDaily() {
  const savedFocus = localStorage.getItem('yeet-focus');
  if (savedFocus) {
    YEET.config.focus = savedFocus;
    setText('focus-text', savedFocus);
  }

  document.getElementById('edit-focus')?.addEventListener('click', () => {
    const newFocus = prompt('What is your focus for today?', YEET.config.focus);
    if (newFocus === null) return;
    YEET.config.focus = newFocus;
    setText('focus-text', newFocus || 'No focus set. Use Edit to define today\'s mission.');
    localStorage.setItem('yeet-focus', newFocus);
    addLog('success', 'Daily focus updated');
  });

  initConverter();
  initBookmarks();
  initNotes();
  initTodos();
}

function initConverter() {
  const input = document.getElementById('conv-input');
  const from = document.getElementById('conv-from');
  const to = document.getElementById('conv-to');
  const result = document.getElementById('converter-result');

  function convert() {
    const value = parseFloat(input?.value) || 0;
    const fromUnit = from?.value;
    const toUnit = to?.value;
    if (!fromUnit || !toUnit || !result) return;

    const toBase = {
      km: 1000,
      m: 1,
      ft: 0.3048,
      mi: 1609.34,
      kg: 1,
      lb: 0.453592,
      c: 1,
      f: 1,
      usd: 1,
      try: 0.029,
      eur: 1.08,
      gbp: 1.27
    };

    let converted;
    if (fromUnit === 'c' && toUnit === 'f') converted = (value * 9) / 5 + 32;
    else if (fromUnit === 'f' && toUnit === 'c') converted = ((value - 32) * 5) / 9;
    else converted = value * (toBase[fromUnit] / toBase[toUnit]);

    const symbols = {
      km: 'km',
      m: 'm',
      ft: 'ft',
      mi: 'mi',
      kg: 'kg',
      lb: 'lb',
      c: '°C',
      f: '°F',
      usd: '$',
      try: '₺',
      eur: '€',
      gbp: '£'
    };
    result.textContent = `${converted.toFixed(2)} ${symbols[toUnit] || toUnit}`;
  }

  [input, from, to].forEach((element) => {
    element?.addEventListener('input', convert);
  });
  convert();
}

function initBookmarks() {
  const saved = localStorage.getItem('yeet-bookmarks');
  if (saved) YEET.config.bookmarks = JSON.parse(saved);

  renderBookmarks();

  document.getElementById('add-bookmark-btn')?.addEventListener('click', () => {
    const name = prompt('Bookmark name:');
    const url = prompt('URL:');
    const icon = prompt('Emoji icon:', '🔗');
    if (!name || !url) return;
    YEET.config.bookmarks.push({ name, url, icon });
    saveConfig();
    renderBookmarks();
  });
}

function renderBookmarks() {
  const list = document.getElementById('bookmarks-list');
  if (!list) return;

  const defaults = [
    { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
    { name: 'ClawHub', url: 'https://clawhub.ai', icon: '🐾' }
  ];

  const all = [...defaults, ...YEET.config.bookmarks];
  list.innerHTML = all.map((bookmark) => `
    <div class="bookmark-item">
      <a href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer" class="bookmark-link">
        <span class="bookmark-icon" aria-hidden="true">${bookmark.icon}</span>
        <span>${escapeHtml(bookmark.name)}</span>
      </a>
    </div>
  `).join('');
}

function initNotes() {
  const textarea = document.getElementById('quick-notes');
  const timestamp = document.getElementById('notes-timestamp');
  const saved = localStorage.getItem('yeet-notes');
  const savedTime = localStorage.getItem('yeet-notes-time');

  if (saved && textarea) textarea.value = saved;
  if (savedTime && timestamp) timestamp.textContent = `Last saved: ${savedTime}`;

  document.getElementById('save-notes')?.addEventListener('click', () => {
    if (!textarea) return;
    localStorage.setItem('yeet-notes', textarea.value);
    const now = new Date().toLocaleString();
    localStorage.setItem('yeet-notes-time', now);
    if (timestamp) timestamp.textContent = `Last saved: ${now}`;
    showToast('Notes saved', 'success');
  });
}

function initTodos() {
  const saved = localStorage.getItem('yeet-todos');
  if (saved) YEET.config.todos = JSON.parse(saved);

  renderTodos();

  document.getElementById('add-todo-btn')?.addEventListener('click', () => {
    const text = prompt('New task:');
    if (!text) return;
    YEET.config.todos.push({ id: Date.now(), text, done: false, priority: 'medium' });
    saveConfig();
    renderTodos();
  });
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  if (!list) return;

  if (YEET.config.todos.length === 0) {
    list.innerHTML = '<p class="empty-state compact">No tasks yet. Add one to start the mission.</p>';
    return;
  }

  list.innerHTML = YEET.config.todos.map((todo) => `
    <div class="todo-item ${todo.done ? 'done' : ''}" data-id="${todo.id}">
      <span class="todo-priority ${todo.priority || 'medium'}" aria-hidden="true"></span>
      <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${todo.id})" aria-label="Toggle task completion">
      <span class="todo-text" contenteditable="true" onblur="editTodo(${todo.id}, this.innerText)">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" type="button" onclick="deleteTodo(${todo.id})" aria-label="Delete task">×</button>
    </div>
  `).join('');
}

window.toggleTodo = function toggleTodo(id) {
  const todo = YEET.config.todos.find((item) => item.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveConfig();
  renderTodos();
};

window.editTodo = function editTodo(id, text) {
  const todo = YEET.config.todos.find((item) => item.id === id);
  if (!todo) return;
  todo.text = text.trim();
  saveConfig();
};

window.deleteTodo = function deleteTodo(id) {
  YEET.config.todos = YEET.config.todos.filter((item) => item.id !== id);
  saveConfig();
  renderTodos();
};

async function checkNetworkStatus() {
  const services = [
    { name: 'OpenClaw Gateway', url: 'http://localhost:3000', status: 'unknown' },
    { name: 'Ollama', url: 'http://localhost:11434', status: 'unknown' },
    { name: 'Dashboard', url: 'http://localhost:8080', status: 'unknown' },
    { name: 'Fadeolog', url: 'http://localhost:3000', status: 'unknown' },
    { name: 'Yigit Map', url: 'http://localhost:3001', status: 'unknown' }
  ];

  await Promise.all(services.map(async (service) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      await fetch(service.url, { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeout);
      service.status = 'online';
    } catch (error) {
      service.status = 'offline';
    }
  }));

  renderNetworkStatus(services);
}

function renderNetworkStatus(services) {
  const container = document.getElementById('network-status');
  if (!container) return;

  const online = services.filter((service) => service.status === 'online').length;
  const offline = services.length - online;

  container.innerHTML = services.map((service) => `
    <div class="service-item ${service.status}">
      <div class="service-main">
        <span class="service-dot" aria-hidden="true"></span>
        <span class="service-name">${escapeHtml(service.name)}</span>
      </div>
      <div class="service-meta">
        <span class="service-endpoint">${escapeHtml(service.url.replace(/^https?:\/\//, ''))}</span>
        <span class="service-status">${service.status}</span>
      </div>
    </div>
  `).join('');

  setText('services-online-count', `${online} online`);
  setText('services-offline-count', `${offline} offline`);
  setText('services-total-count', String(services.length));
  setText('services-summary-online', String(online));
  setText('services-summary-offline', String(offline));
  setText('services-summary-status', offline > 0 ? 'Attention required' : 'Nominal');
}

function detectSystem() {
  YEET.state.platform = navigator.platform || 'unknown';
  YEET.state.hostname = window.location.hostname || 'localhost';

  setText('hostname', YEET.state.hostname);
  setText('platform', YEET.state.platform);
}

function initLogs() {
  renderLogs();

  document.getElementById('pause-logs')?.addEventListener('click', () => {
    YEET.state.isPaused = !YEET.state.isPaused;
    const button = document.getElementById('pause-logs');
    if (button) {
      button.textContent = YEET.state.isPaused ? 'Resume' : 'Pause';
      button.setAttribute('aria-pressed', String(YEET.state.isPaused));
    }
    showToast(YEET.state.isPaused ? 'Log feed paused' : 'Log feed resumed', 'info');
    if (!YEET.state.isPaused) addLog('info', 'Log feed resumed');
  });

  document.getElementById('clear-logs')?.addEventListener('click', () => {
    YEET.state.logs = [];
    renderLogs();
    renderAlertFeed();
    addLog('info', 'Logs cleared');
  });

  document.getElementById('log-search')?.addEventListener('input', (event) => {
    YEET.state.logFilter = event.target.value.trim().toLowerCase();
    renderLogs();
  });
}

function pushLog(level, message) {
  if (YEET.state.isPaused) return;

  YEET.state.logs.unshift({
    time: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    level,
    message
  });

  if (YEET.state.logs.length > 150) YEET.state.logs.pop();
  renderLogs();
  renderAlertFeed();
}

function renderLogs() {
  const viewer = document.getElementById('log-viewer');
  if (!viewer) return;

  const filter = (YEET.state.logFilter || '').toLowerCase();
  const logs = YEET.state.logs.filter((log) => {
    if (!filter) return true;
    return `${log.time} ${log.level} ${log.message}`.toLowerCase().includes(filter);
  });

  setText('log-count', `${logs.length} entr${logs.length === 1 ? 'y' : 'ies'}`);

  if (logs.length === 0) {
    viewer.innerHTML = '<p class="empty-state compact">No log entries match the current filter.</p>';
    return;
  }

  viewer.innerHTML = logs.map((log) => `
    <div class="log-entry level-${log.level}">
      <span class="log-entry-marker" aria-hidden="true"></span>
      <div class="log-entry-main">
        <div class="log-entry-topline">
          <span class="log-timestamp">${log.time}</span>
          <span class="log-level-badge">${log.level.toUpperCase()}</span>
        </div>
        <div class="log-message">${escapeHtml(log.message)}</div>
      </div>
    </div>
  `).join('');
}

function renderAlertFeed() {
  const feed = document.getElementById('alert-feed');
  if (!feed) return;

  const recent = YEET.state.logs.slice(0, 4);
  updateAlertCount();

  if (recent.length === 0) {
    feed.innerHTML = '<p class="empty-state compact">No operational events yet.</p>';
    return;
  }

  feed.innerHTML = recent.map((entry) => `
    <article class="alert-item ${entry.level}">
      <div class="alert-pill">${entry.level.toUpperCase()}</div>
      <div class="alert-copy">
        <strong>${entry.time}</strong>
        <span>${escapeHtml(entry.message)}</span>
      </div>
    </article>
  `).join('');
}

function updateAlertCount() {
  const alerts = YEET.state.logs.filter((entry) => entry.level === 'warn' || entry.level === 'error').length;
  setText('alert-count', String(alerts));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function titleCase(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pseudoMetric(seed, min, max) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  const range = max - min;
  return min + (Math.abs(hash) % (range + 1));
}

window.addLog = pushLog;
