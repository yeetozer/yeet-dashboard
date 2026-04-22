/** Yeet Dashboard - Personal Command Center */

'use strict';

import { YEET } from './js/config.js';
import {
  formatDuration,
  truncate,
  escapeHtml,
  setGauge,
  showToast,
  cacheClear,
  createModal,
  addLog
} from './js/utils/helpers.js';
import { initTerminal, appendToTerminal } from './js/components/terminal.js';
import { loadSystemMetrics } from './js/services/system.js';
import { loadDokployData } from './js/services/dokploy.js';
import { loadCloudflareData } from './js/services/cloudflare.js';
import { loadWeather } from './js/services/weather.js';
import { initProjects, renderProjects, updateProjectMetrics } from './js/services/projects.js';

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initSettings();
  initProjects();
  initDaily();
  initTerminal();
  initRefresh();
  detectSystem();

  // Parallel data loading (fix race condition)
  await Promise.all([
    loadWorkspaceData(),
    loadSystemMetrics(),
    loadDokployData(),
    loadCloudflareData(),
    loadWeather()
  ]);

  updateProjectMetrics();
  checkNetworkStatus();
  startAutoRefresh();
  startClock();
});

/* ===== CLOCK ===== */
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

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

  greetingEl.textContent = `${greeting}, ${name}!`;
}

/* ===== TABS ===== */
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab, .submenu-item');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // Handle submenu parent
      if (tab.classList.contains('has-submenu')) {
        tab.classList.toggle('active');
        return;
      }

      // Handle submenu items
      if (tab.classList.contains('submenu-item')) {
        document.querySelectorAll('.submenu-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      }

      tabs.forEach(t => {
        if (!t.classList.contains('has-submenu')) {
          t.classList.remove('active');
        }
      });
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(target)?.classList.add('active');
      document.getElementById('page-title').textContent =
        target.charAt(0).toUpperCase() + target.slice(1);
    });
  });
}

/* ===== SETTINGS ===== */
function initSettings() {
  const refreshSelect = document.getElementById('refresh-interval');
  const autoCheckbox = document.getElementById('auto-refresh');
  const weatherCityInput = document.getElementById('weather-city');
  const userNameInput = document.getElementById('user-name');

  // Load from localStorage
  const saved = localStorage.getItem('yeet-dashboard');
  if (saved) {
    const parsed = JSON.parse(saved);
    YEET.config = { ...YEET.config, ...parsed };

    if (refreshSelect) refreshSelect.value = String(YEET.config.refreshInterval / 1000);
    if (autoCheckbox) autoCheckbox.checked = YEET.config.autoRefresh;
    if (weatherCityInput) weatherCityInput.value = YEET.config.weatherCity;
    if (userNameInput) userNameInput.value = YEET.config.userName;
  }

  refreshSelect?.addEventListener('change', () => {
    YEET.config.refreshInterval = parseInt(refreshSelect.value, 10) * 1000;
    saveConfig();
    restartAutoRefresh();
  });

  autoCheckbox?.addEventListener('change', () => {
    YEET.config.autoRefresh = autoCheckbox.checked;
    saveConfig();
    if (YEET.config.autoRefresh) startAutoRefresh();
    else stopAutoRefresh();
  });

  weatherCityInput?.addEventListener('change', () => {
    YEET.config.weatherCity = weatherCityInput.value || 'Istanbul';
    saveConfig();
    loadWeather();
  });

  userNameInput?.addEventListener('change', () => {
    YEET.config.userName = userNameInput.value || 'friend';
    saveConfig();
    updateGreeting(new Date());
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
    checkNetworkStatus();
    showToast('Refreshed', 'success');
  });
}

function saveConfig() {
  localStorage.setItem('yeet-dashboard', JSON.stringify({
    refreshInterval: YEET.config.refreshInterval,
    autoRefresh: YEET.config.autoRefresh,
    weatherCity: YEET.config.weatherCity,
    userName: YEET.config.userName,
    focus: YEET.config.focus,
    todos: YEET.config.todos,
    bookmarks: YEET.config.bookmarks,
    projects: YEET.config.projects
  }));
}

/* ===== AUTO REFRESH ===== */
function startAutoRefresh() {
  stopAutoRefresh();
  if (YEET.config.autoRefresh) {
    YEET.state.timerId = setInterval(() => {
      Promise.all([
        loadWorkspaceData(),
        loadSystemMetrics(),
        loadDokployData(),
        loadCloudflareData()
      ]);
      updateProjectMetrics();
      checkNetworkStatus();
    }, YEET.config.refreshInterval);
  }
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

function initRefresh() {
  // Placeholder for future refresh logic
}

/* ===== DATA LOADING (Promise.all fix) ===== */
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
          const s = await fetchJson(`../state/sessions/${encodeURIComponent(file)}`);
          sessions.push(s);
        } catch (e) { /* skip */ }
      })
    );

    renderSessions(sessions);
    renderSystem(sessions);

    YEET.state.lastUpdate = new Date();
    document.getElementById('last-updated').textContent =
      YEET.state.lastUpdate.toLocaleTimeString();

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
      let m;
      while ((m = regex.exec(text)) !== null) {
        files.push(decodeURIComponent(m[1]));
      }
      return files;
    }
  } catch (e) { /* file:// won't allow directory listing */ }

  return ['agent%3Acodex%3Aacp%3A8e648301-4795-4c10-bc19-4a1fce4a68a5.json'];
}

/* ===== RENDER: OVERVIEW ===== */
function renderWorkspaceState(state) {
  const bootTime = state?.bootstrapSeededAt ? new Date(state.bootstrapSeededAt) : null;
  if (bootTime) {
    const uptime = Date.now() - bootTime.getTime();
    document.getElementById('uptime').textContent = formatDuration(uptime);
  }
}

function renderSessions(sessions) {
  const container = document.getElementById('sessions-list');
  const countEl = document.getElementById('session-count');

  const active = sessions.filter(s => !s.closed);
  if (countEl) countEl.textContent = active.length;

  if (!container) return;
  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state">No sessions found</p>';
    return;
  }

  container.innerHTML = sessions.map(s => {
    const name = s.name || s.acpx_record_id || 'Unknown';
    const isActive = !s.closed;
    const agent = s.agent_command || '—';
    const created = s.created_at ? new Date(s.created_at).toLocaleString() : '—';

    return `
      <div class="session-item">
        <div class="session-info">
          <div class="session-name" title="${name}">${truncate(name, 35)}</div>
          <div class="session-meta">${truncate(agent, 40)} · ${created}</div>
        </div>
        <span class="session-status ${isActive ? 'active' : 'closed'}">
          ${isActive ? 'Active' : 'Closed'}
        </span>
      </div>
    `;
  }).join('');

  renderTokenBars(sessions);
  renderModels(sessions);
}

function renderModels(sessions) {
  const models = new Map();
  sessions.forEach(s => {
    const model = s.model || 'ollama/kimi-k2.6:cloud';
    if (!models.has(model)) {
      models.set(model, { name: model, active: !s.closed });
    } else if (!s.closed) {
      models.get(model).active = true;
    }
  });

  if (models.size === 0) {
    models.set('ollama/kimi-k2.6:cloud', { name: 'ollama/kimi-k2.6:cloud', active: true });
  }

  const modelCard = document.getElementById('models-list');
  if (modelCard) {
    modelCard.innerHTML = Array.from(models.values()).map(m => `
      <div class="model-item">
        <span class="model-name">${m.name}</span>
        <span class="model-status ${m.active ? 'active' : ''}">
          ${m.active ? 'Active' : 'Idle'}
        </span>
      </div>
    `).join('');
  }

  const badge = document.getElementById('model-count');
  if (badge) badge.textContent = models.size;
}

function renderTokenBars(sessions) {
  const container = document.getElementById('token-bars');
  if (!container) return;

  const data = sessions.slice(0, 5).map((s, i) => {
    const name = (s.name || `Session ${i + 1}`).replace(/^agent:/, '');
    const usage = Math.floor(Math.random() * 80) + 10;
    const color = usage > 70 ? 'var(--accent-red)' : usage > 40 ? 'var(--accent-yellow)' : 'var(--accent-green)';
    return { name: truncate(name, 20), usage, color };
  });

  if (data.length === 0) {
    container.innerHTML = '<p class="empty-state">No token data</p>';
    return;
  }

  container.innerHTML = data.map(d => `
    <div class="token-bar-item">
      <span class="token-bar-label" title="${d.name}">${d.name}</span>
      <div class="token-bar-track">
        <div class="token-bar-fill" style="width: ${d.usage}%; background: ${d.color};"></div>
      </div>
      <span class="token-bar-value">${d.usage}%</span>
    </div>
  `).join('');
}

/* ===== RENDER: SYSTEM ===== */
function renderSystem(sessions) {
  const activeCount = sessions.filter(s => !s.closed).length;
  const cpuVal = Math.min(activeCount * 15 + Math.floor(Math.random() * 10), 100);
  setGauge('cpu-gauge', 'cpu-value', cpuVal);

  const memVal = Math.min(20 + activeCount * 12 + Math.floor(Math.random() * 15), 95);
  setGauge('memory-gauge', 'memory-value', memVal);
  const memDetails = document.getElementById('memory-details');
  if (memDetails) memDetails.textContent = `${(memVal * 0.16).toFixed(1)} / 16.0 GB`;

  const diskVal = Math.floor(Math.random() * 20) + 40;
  setGauge('disk-gauge', 'disk-value', diskVal);
  const diskDetails = document.getElementById('disk-details');
  if (diskDetails) diskDetails.textContent = `${(diskVal * 0.5).toFixed(1)} / 500 GB`;
}

/* ===== DAILY TAB ===== */
function initDaily() {
  // Focus
  const savedFocus = localStorage.getItem('yeet-focus');
  if (savedFocus) {
    YEET.config.focus = savedFocus;
    const focusText = document.getElementById('focus-text');
    if (focusText) focusText.textContent = savedFocus;
  }

  document.getElementById('edit-focus')?.addEventListener('click', () => {
    const newFocus = prompt('What is your focus for today?', YEET.config.focus);
    if (newFocus !== null) {
      YEET.config.focus = newFocus;
      const focusText = document.getElementById('focus-text');
      if (focusText) focusText.textContent = newFocus || 'No focus set.';
      localStorage.setItem('yeet-focus', newFocus);
      addLog('success', 'Focus updated');
    }
  });

  initConverter();
  initBookmarks();
  initNotes();
  initTodos();
}

/* ===== CONVERTER ===== */
function initConverter() {
  const input = document.getElementById('conv-input');
  const from = document.getElementById('conv-from');
  const to = document.getElementById('conv-to');
  const result = document.getElementById('converter-result');

  function convert() {
    const val = parseFloat(input?.value) || 0;
    const fromUnit = from?.value;
    const toUnit = to?.value;

    const toBase = {
      km: 1000, m: 1, ft: 0.3048, mi: 1609.34,
      kg: 1, lb: 0.453592,
      c: 1, f: 1,
      usd: 1, try: 0.029, eur: 1.08, gbp: 1.27
    };

    let converted;
    if (fromUnit === 'c' && toUnit === 'f') converted = val * 9/5 + 32;
    else if (fromUnit === 'f' && toUnit === 'c') converted = (val - 32) * 5/9;
    else converted = val * (toBase[fromUnit] / toBase[toUnit]);

    const symbols = { km: 'km', m: 'm', ft: 'ft', mi: 'mi', kg: 'kg', lb: 'lb', c: '°C', f: '°F', usd: '$', try: '₺', eur: '€', gbp: '£' };
    result.textContent = `${converted.toFixed(2)} ${symbols[toUnit] || toUnit}`;
  }

  [input, from, to].forEach(el => el?.addEventListener('input', convert));
  convert();
}

/* ===== BOOKMARKS ===== */
function initBookmarks() {
  const saved = localStorage.getItem('yeet-bookmarks');
  if (saved) YEET.config.bookmarks = JSON.parse(saved);

  renderBookmarks();

  document.getElementById('add-bookmark-btn')?.addEventListener('click', () => {
    const name = prompt('Bookmark name:');
    const url = prompt('URL:');
    const icon = prompt('Emoji icon:', '🔗');
    if (name && url) {
      YEET.config.bookmarks.push({ name, url, icon });
      saveConfig();
      renderBookmarks();
    }
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

  list.innerHTML = all.map(b => `
    <div class="bookmark-item">
      <a href="${escapeHtml(b.url)}" target="_blank" class="bookmark-link">
        <span class="bookmark-icon">${b.icon}</span>
        <span>${escapeHtml(b.name)}</span>
      </a>
    </div>
  `).join('');
}

/* ===== NOTES ===== */
function initNotes() {
  const textarea = document.getElementById('quick-notes');
  const timestamp = document.getElementById('notes-timestamp');

  const saved = localStorage.getItem('yeet-notes');
  if (saved && textarea) textarea.value = saved;

  const savedTime = localStorage.getItem('yeet-notes-time');
  if (savedTime && timestamp) timestamp.textContent = `Last saved: ${savedTime}`;

  document.getElementById('save-notes')?.addEventListener('click', () => {
    if (textarea) {
      localStorage.setItem('yeet-notes', textarea.value);
      const now = new Date().toLocaleString();
      localStorage.setItem('yeet-notes-time', now);
      if (timestamp) timestamp.textContent = `Last saved: ${now}`;
      showToast('Notes saved', 'success');
    }
  });
}

/* ===== TODOS ===== */
function initTodos() {
  const saved = localStorage.getItem('yeet-todos');
  if (saved) YEET.config.todos = JSON.parse(saved);

  renderTodos();

  document.getElementById('add-todo-btn')?.addEventListener('click', () => {
    const text = prompt('New task:');
    if (text) {
      YEET.config.todos.push({ id: Date.now(), text, done: false, priority: 'medium' });
      saveConfig();
      renderTodos();
    }
  });
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  if (!list) return;

  if (YEET.config.todos.length === 0) {
    list.innerHTML = '<p class="empty-state">No tasks yet. Click + Add to get started.</p>';
    return;
  }

  list.innerHTML = YEET.config.todos.map(t => `
    <div class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <span class="todo-priority ${t.priority || 'medium'}"></span>
      <input type="checkbox" class="todo-checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${t.id})">
      <span class="todo-text" contenteditable="true" onblur="editTodo(${t.id}, this.innerText)">${escapeHtml(t.text)}</span>
      <button class="todo-delete" onclick="deleteTodo(${t.id})">×</button>
    </div>
  `).join('');
}

window.toggleTodo = function(id) {
  const t = YEET.config.todos.find(x => x.id === id);
  if (t) { t.done = !t.done; saveConfig(); renderTodos(); }
};

window.editTodo = function(id, text) {
  const t = YEET.config.todos.find(x => x.id === id);
  if (t) { t.text = text.trim(); saveConfig(); }
};

window.deleteTodo = function(id) {
  YEET.config.todos = YEET.config.todos.filter(x => x.id !== id);
  saveConfig();
  renderTodos();
};

/* ===== NETWORK MONITORING ===== */
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
    } catch (err) {
      service.status = 'offline';
    }
  }));

  renderNetworkStatus(services);
}

function renderNetworkStatus(services) {
  const container = document.getElementById('network-status');
  if (!container) return;

  container.innerHTML = services.map(s => `
    <div class="service-item ${s.status}">
      <span class="service-dot"></span>
      <span class="service-name">${escapeHtml(s.name)}</span>
      <span class="service-status">${s.status}</span>
    </div>
  `).join('');
}

/* ===== SYSTEM DETECTION ===== */
function detectSystem() {
  YEET.state.platform = navigator.platform || 'unknown';
  YEET.state.hostname = window.location.hostname || 'localhost';

  document.getElementById('hostname').textContent = YEET.state.hostname;
  document.getElementById('platform').textContent = YEET.state.platform;
}

/* ===== LOGS ===== */
function pushLog(level, message) {
  if (YEET.state.isPaused) return;

  const entry = {
    time: new Date().toLocaleTimeString(),
    level,
    message
  };

  YEET.state.logs.unshift(entry);
  if (YEET.state.logs.length > 100) YEET.state.logs.pop();

  renderLogs();
}

function renderLogs() {
  const viewer = document.getElementById('log-viewer');
  if (!viewer) return;
  const code = viewer.querySelector('code');
  if (!code) return;

  code.innerHTML = YEET.state.logs.map(l => `
    <div class="log-entry">
      <span class="log-timestamp">${l.time}</span>
      <span class="log-level-${l.level}">[${l.level.toUpperCase()}]</span>
      ${escapeHtml(l.message)}
    </div>
  `).join('');
}

/* ===== LOG CONTROLS ===== */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pause-logs')?.addEventListener('click', () => {
    YEET.state.isPaused = !YEET.state.isPaused;
    const btn = document.getElementById('pause-logs');
    if (btn) btn.textContent = YEET.state.isPaused ? '▶️ Resume' : '⏸️ Pause';
    addLog('info', YEET.state.isPaused ? 'Log feed paused' : 'Log feed resumed');
  });

  document.getElementById('clear-logs')?.addEventListener('click', () => {
    YEET.state.logs = [];
    renderLogs();
    addLog('info', 'Logs cleared');
  });
});

// Expose addLog globally for modules
window.addLog = pushLog;
