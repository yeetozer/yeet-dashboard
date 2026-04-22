/** Yeet Dashboard - Personal Command Center */

'use strict';

const YEET = {
  config: {
    refreshInterval: 30000,
    autoRefresh: true,
    sessionFiles: [],
    projects: [],
    todos: [],
    bookmarks: [],
    focus: '',
    weatherCity: 'Istanbul',
    userName: 'Yigit'
  },
  state: {
    lastUpdate: null,
    logs: [],
    isPaused: false,
    timerId: null,
    hostname: 'localhost',
    platform: 'unknown'
  }
};

/* ===== SYSTEM METRICS ===== */
async function loadSystemMetrics() {
  try {
    // Load CPU usage
    const cpuData = await fetchSystemMetric('cpu');
    updateCpuGauge(cpuData.usage);
    
    // Load RAM usage
    const memData = await fetchSystemMetric('memory');
    updateMemoryGauge(memData.used, memData.total);
    
    // Load Disk usage
    const diskData = await fetchSystemMetric('disk');
    updateDiskGauge(diskData.used, diskData.total);
    
    // Load processes
    const processes = await fetchSystemMetric('processes');
    renderProcesses(processes);
    
    addLog('info', 'System metrics updated');
  } catch (err) {
    addLog('error', `Metrics failed: ${err.message}`);
  }
}

async function fetchSystemMetric(type) {
  // Mock data for now - in production, this would fetch from a system API
  switch(type) {
    case 'cpu':
      return { usage: Math.floor(Math.random() * 30) + 10 }; // 10-40% random
    case 'memory':
      return { used: 4.2, total: 16 }; // 4.2GB used of 16GB
    case 'disk':
      return { used: 45, total: 100 }; // 45GB used of 100GB
    case 'processes':
      return [
        { pid: 54922, name: 'python3', cpu: '2.1', mem: '1.2' },
        { pid: 54894, name: 'node', cpu: '5.4', mem: '3.8' },
        { pid: 1, name: 'systemd', cpu: '0.1', mem: '0.5' },
        { pid: 1234, name: 'ollama', cpu: '12.3', mem: '8.2' }
      ];
    default:
      return {};
  }
}

function updateCpuGauge(usage) {
  const gauge = document.getElementById('cpu-gauge');
  const value = document.getElementById('cpu-value');
  if (!gauge || !value) return;
  
  gauge.style.setProperty('--value', `${usage}%`);
  value.textContent = `${usage}%`;
  
  // Color based on usage
  if (usage > 80) gauge.classList.add('critical');
  else if (usage > 60) gauge.classList.add('warning');
  else gauge.classList.remove('critical', 'warning');
}

function updateMemoryGauge(used, total) {
  const gauge = document.getElementById('mem-gauge');
  const value = document.getElementById('mem-value');
  const details = document.getElementById('mem-details');
  if (!gauge || !value || !details) return;
  
  const percent = Math.round((used / total) * 100);
  gauge.style.setProperty('--value', `${percent}%`);
  value.textContent = `${percent}%`;
  details.textContent = `${used} / ${total} GB`;
}

function updateDiskGauge(used, total) {
  const gauge = document.getElementById('disk-gauge');
  const value = document.getElementById('disk-value');
  const details = document.getElementById('disk-details');
  if (!gauge || !value || !details) return;
  
  const percent = Math.round((used / total) * 100);
  gauge.style.setProperty('--value', `${percent}%`);
  value.textContent = `${percent}%`;
  details.textContent = `${used} / ${total} GB`;
}

function renderProcesses(processes) {
  const tbody = document.getElementById('process-list');
  if (!tbody) return;
  
  tbody.innerHTML = processes.map(p => `
    <tr>
      <td>${p.pid}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.cpu}%</td>
      <td>${p.mem}%</td>
    </tr>
  `).join('');
}

/* ===== TERMINAL ===== */
function initTerminal() {
  const input = document.getElementById('terminal-input');
  const output = document.getElementById('terminal-output');
  if (!input || !output) return;
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (!cmd) return;
      
      appendToTerminal(`$ ${cmd}`, 'command');
      executeCommand(cmd);
      input.value = '';
    }
  });
  
  appendToTerminal('Welcome to Yeet Terminal', 'info');
  appendToTerminal('Type "help" for available commands', 'info');
}

function appendToTerminal(text, type = 'output') {
  const output = document.getElementById('terminal-output');
  if (!output) return;
  
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function executeCommand(cmd) {
  const commands = {
    help: () => {
      appendToTerminal('Available commands:', 'info');
      appendToTerminal('  status    - Show system status', 'output');
      appendToTerminal('  projects  - List all projects', 'output');
      appendToTerminal('  clear     - Clear terminal', 'output');
      appendToTerminal('  whoami    - Show current user', 'output');
      appendToTerminal('  date      - Show current date/time', 'output');
    },
    status: () => {
      appendToTerminal(`System: ${YEET.state.platform}`, 'output');
      appendToTerminal(`Hostname: ${YEET.state.hostname}`, 'output');
      appendToTerminal(`Uptime: ${formatUptime(performance.now())}`, 'output');
    },
    projects: () => {
      YEET.config.projects.forEach(p => {
        appendToTerminal(`  ${p.name} - ${p.status || 'unknown'}`, 'output');
      });
    },
    clear: () => {
      const output = document.getElementById('terminal-output');
      if (output) output.innerHTML = '';
    },
    whoami: () => appendToTerminal(YEET.config.userName || 'Yigit', 'output'),
    date: () => appendToTerminal(new Date().toLocaleString('tr-TR'), 'output')
  };
  
  const cmdFn = commands[cmd.toLowerCase()];
  if (cmdFn) {
    cmdFn();
  } else {
    appendToTerminal(`Command not found: ${cmd}`, 'error');
    appendToTerminal('Type "help" for available commands', 'info');
  }
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSettings();
  initProjects();
  initDaily();
  initTerminal();
  initRefresh();
  detectSystem();
  loadWorkspaceData();
  loadSystemMetrics();
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
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
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

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadWorkspaceData();
    loadSystemMetrics();
    loadWeather();
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
      loadWorkspaceData();
      loadSystemMetrics();
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

/* ===== DATA LOADING ===== */
async function loadWorkspaceData() {
  try {
    const wsState = await fetchJson('../.openclaw/workspace-state.json');
    renderWorkspaceState(wsState);

    YEET.config.sessionFiles = await discoverSessions();
    const sessions = [];
    for (const file of YEET.config.sessionFiles.slice(0, 10)) {
      try {
        const s = await fetchJson(`../state/sessions/${encodeURIComponent(file)}`);
        sessions.push(s);
      } catch (e) { /* skip */ }
    }
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

/* ===== WEATHER ===== */
async function loadWeather() {
  const city = YEET.config.weatherCity || 'Istanbul';

  try {
    // Simple one-liner
    const simpleRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C|%t|%w|%h`);
    const simpleText = await simpleRes.text();
    const [condition, temp, wind, humidity] = simpleText.trim().split('|');

    // Overview card
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

    // Detailed card
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
  } catch (err) {
    console.error('Weather load failed:', err);
  }
}

function getWeatherEmoji(condition) {
  const c = (condition || '').toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return '☀️';
  if (c.includes('cloud')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  return '⛅';
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
  countEl.textContent = active.length;

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
  document.getElementById('memory-details').textContent =
    `${(memVal * 0.16).toFixed(1)} / 16.0 GB`;

  const diskVal = Math.floor(Math.random() * 20) + 40;
  setGauge('disk-gauge', 'disk-value', diskVal);
  document.getElementById('disk-details').textContent =
    `${(diskVal * 0.5).toFixed(1)} / 500 GB`;

  renderProcesses(sessions);
}

function setGauge(gaugeId, valueId, percent) {
  const gauge = document.getElementById(gaugeId);
  const value = document.getElementById(valueId);
  if (gauge) gauge.style.setProperty('--value', percent);
  if (value) value.textContent = percent + '%';
}

function renderProcesses(sessions) {
  const tbody = document.getElementById('process-list');
  const procs = sessions.map(s => ({
    pid: s.pid || '—',
    name: truncate((s.agent_command || s.name || 'unknown').split('/').pop() || 'unknown', 25),
    cpu: (Math.random() * 5 + 0.5).toFixed(1),
    mem: (Math.random() * 3 + 0.5).toFixed(1)
  }));

  if (procs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No processes</td></tr>';
    return;
  }

  tbody.innerHTML = procs.map(p => `
    <tr>
      <td>${p.pid}</td>
      <td>${p.name}</td>
      <td>${p.cpu}%</td>
      <td>${p.mem}%</td>
    </tr>
  `).join('');
}

/* ===== LOGS ===== */
function addLog(level, message) {
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

  code.innerHTML = YEET.state.logs.map(l => `
    <div class="log-entry">
      <span class="log-timestamp">${l.time}</span>
      <span class="log-level-${l.level}">[${l.level.toUpperCase()}]</span>
      ${escapeHtml(l.message)}
    </div>
  `).join('');
}

/* ===== DAILY TAB ===== */
function initDaily() {
  // Focus
  const savedFocus = localStorage.getItem('yeet-focus');
  if (savedFocus) {
    YEET.config.focus = savedFocus;
    document.getElementById('focus-text').textContent = savedFocus;
  }

  document.getElementById('edit-focus')?.addEventListener('click', () => {
    const newFocus = prompt('What is your focus for today?', YEET.config.focus);
    if (newFocus !== null) {
      YEET.config.focus = newFocus;
      document.getElementById('focus-text').textContent = newFocus || 'No focus set.';
      localStorage.setItem('yeet-focus', newFocus);
      addLog('success', 'Focus updated');
    }
  });

  // Converter
  initConverter();

  // Bookmarks
  initBookmarks();

  // Notes
  initNotes();

  // Todos
  initTodos();

  // Weather
  loadWeather();
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

    // Conversion factors to base unit
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

/* ===== PROJECTS ===== */
function initProjects() {
  const saved = localStorage.getItem('yeet-projects');
  if (saved) YEET.config.projects = JSON.parse(saved);
  else {
    YEET.config.projects = [
      { id: '1', name: 'OpenClaw Core', description: 'Main agent workspace', path: '~/.openclaw/workspace', tags: ['agent', 'core'], gitStatus: 'clean', lastCommit: '2 days ago' },
      { id: '2', name: 'Yeet Dashboard', description: 'This dashboard', path: 'mission-control/', tags: ['frontend', 'dashboard'], gitStatus: 'modified', lastCommit: '5 hours ago' },
      { id: '3', name: 'Fadeolog System', description: 'Barber shop appointment system (Next.js + Django)', path: 'D:/Program Files (x86)/fadeolog_system | C:/Users/HP/fadeolog_system', tags: ['fullstack', 'docker', 'production'], gitStatus: 'clean', lastCommit: '3 days ago', status: 'running', port: '3000', cpu: 12, mem: 8.5 },
      { id: '4', name: 'Yigit Map System', description: 'Map-first city guide platform (Web + Mobile)', path: 'D:/Program Files (x86)/yigit-map | D:/Program Files (x86)/yigit-map-mobile', tags: ['fullstack', 'docker', 'production'], gitStatus: 'ahead', lastCommit: '1 week ago', status: 'stopped', port: '3001', cpu: 0, mem: 0 },
      { id: '5', name: 'Biryolbulalim', description: 'Route/path finding app', path: 'D:/Program Files (x86)/biryolbulalim', tags: ['nodejs', 'docker', 'production'], gitStatus: 'clean', lastCommit: '2 weeks ago', status: 'stopped', port: '3002', cpu: 0, mem: 0 },
      { id: '6', name: 'Yigit Solutions', description: 'Agency/business site', path: 'D:/Program Files (x86)/yigitsolutions', tags: ['nextjs', 'docker', 'production'], gitStatus: 'modified', lastCommit: '4 days ago', status: 'running', port: '3003', cpu: 5, mem: 4.2 },
      { id: '7', name: 'HPE Gromme Tryout', description: 'HPE Gromme trial project', path: 'D:/Program Files (x86)/hpe-gromme-tryout', tags: ['react', 'nodejs'], gitStatus: 'clean', lastCommit: '1 month ago' },
      { id: '8', name: 'PM Dev Roadmap', description: 'Project management roadmap', path: 'D:/Program Files (x86)/pm-dev-roadmap', tags: ['nextjs', 'nodejs'], gitStatus: 'behind', lastCommit: '2 months ago' },
      { id: '9', name: 'SPFX Solution', description: 'SharePoint Framework solution', path: 'D:/Program Files (x86)/spfx-solution', tags: ['react', 'nodejs'], gitStatus: 'clean', lastCommit: '3 months ago' },
      { id: '10', name: 'Sticker', description: 'Sticker app with Next.js', path: 'D:/Program Files (x86)/sticker', tags: ['nextjs', 'nodejs'], gitStatus: 'clean', lastCommit: '3 weeks ago' }
    ];
    saveConfig();
  }

  renderProjects();

  document.getElementById('add-project-btn')?.addEventListener('click', showAddProjectModal);
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (YEET.config.projects.length === 0) {
    grid.innerHTML = '<p class="empty-state">No projects yet. Click + Add Project to get started.</p>';
    return;
  }

  grid.innerHTML = YEET.config.projects.map(p => {
    const isSystem = p.tags?.includes('fullstack');
    let subProjects = '';
    
    if (isSystem) {
      if (p.name.includes('Fadeolog')) {
        subProjects = `
          <div class="project-sub">
            <div class="sub-item">
              <span class="sub-dot frontend"></span>
              <span>Frontend: Next.js (Port 3000)</span>
            </div>
            <div class="sub-item">
              <span class="sub-dot backend"></span>
              <span>Backend: Django API (Port 8000)</span>
            </div>
          </div>
        `;
      } else if (p.name.includes('Yigit Map')) {
        subProjects = `
          <div class="project-sub">
            <div class="sub-item">
              <span class="sub-dot frontend"></span>
              <span>Web: Next.js + Leaflet</span>
            </div>
            <div class="sub-item">
              <span class="sub-dot backend"></span>
              <span>Mobile: Expo + MapLibre</span>
            </div>
          </div>
        `;
      }
    }
    
    const gitStatusColor = p.gitStatus === 'clean' ? 'var(--accent-green)' : 
                            p.gitStatus === 'modified' ? 'var(--accent-yellow)' : 
                            p.gitStatus === 'ahead' ? 'var(--accent-blue)' : 
                            p.gitStatus === 'behind' ? 'var(--accent-orange)' : 'var(--text-muted)';
    const gitStatusIcon = p.gitStatus === 'clean' ? '✓' : 
                          p.gitStatus === 'modified' ? '!' : 
                          p.gitStatus === 'ahead' ? '↑' : 
                          p.gitStatus === 'behind' ? '↓' : '?';
    
    const isRunning = p.status === 'running';
    const statusColor = isRunning ? 'var(--accent-green)' : 'var(--text-muted)';
    const statusText = isRunning ? '●' : '○';
    
    return `
    <div class="project-card ${isSystem ? 'system-card' : ''}" data-id="${p.id}">
      <div class="project-header">
        <h4>${escapeHtml(p.name)}</h4>
        <div class="project-health" title="Git: ${p.gitStatus} | Last commit: ${p.lastCommit}">
          <span class="git-status" style="color: ${gitStatusColor}">${gitStatusIcon} ${p.gitStatus}</span>
          <span class="last-commit">${p.lastCommit}</span>
        </div>
      </div>
      <div class="project-status-bar">
        <span class="status-indicator" style="color: ${statusColor}" title="${isRunning ? 'Running on port ' + p.port : 'Stopped'}">
          ${statusText} ${isRunning ? 'Port ' + p.port : 'Stopped'}
        </span>
        ${isRunning ? `
          <button class="btn btn-sm btn-stop" onclick="toggleProjectStatus('${p.id}')">⏹ Stop</button>
          <a href="http://localhost:${p.port}" target="_blank" class="btn btn-sm">↗ Open</a>
        ` : `
          <button class="btn btn-sm btn-start" onclick="toggleProjectStatus('${p.id}')">▶ Start</button>
        `}
      </div>
      <p>${escapeHtml(p.description || '')}</p>
      ${subProjects}
      <div class="project-resources">
        <div class="resource-bar">
          <span class="resource-label">CPU</span>
          <div class="resource-track">
            <div class="resource-fill" style="width: ${p.cpu || 0}%; background: ${(p.cpu || 0) > 80 ? 'var(--accent-red)' : (p.cpu || 0) > 60 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div>
          </div>
          <span class="resource-value">${p.cpu || 0}%</span>
        </div>
        <div class="resource-bar">
          <span class="resource-label">MEM</span>
          <div class="resource-track">
            <div class="resource-fill" style="width: ${p.mem || 0}%; background: ${(p.mem || 0) > 80 ? 'var(--accent-red)' : (p.mem || 0) > 60 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div>
          </div>
          <span class="resource-value">${p.mem || 0}%</span>
        </div>
      </div>
      <div class="project-tags">
        ${(p.tags || []).map(t => `<span class="project-tag tag-${t}">${t}</span>`).join('')}
      </div>
      <div class="project-meta">
        <span>${escapeHtml(p.path || '')}</span>
      </div>
      <div class="project-actions">
        <button class="btn btn-sm" onclick="openProjectFolder('${p.id}')" title="Open Folder">📁</button>
        <button class="btn btn-sm" onclick="openProjectGithub('${p.id}')" title="GitHub">🐙</button>
        <button class="btn btn-sm" onclick="editProject('${p.id}')">Edit</button>
        <button class="btn btn-sm" onclick="deleteProject('${p.id}')" style="color: var(--accent-red);">Delete</button>
      </div>
    </div>
  `}).join('');
}

window.editProject = function(id) {
  const p = YEET.config.projects.find(x => x.id === id);
  if (!p) return;

  createModal('Edit Project', [
    { id: 'p-name', label: 'Name', type: 'text', value: p.name },
    { id: 'p-desc', label: 'Description', type: 'textarea', value: p.description },
    { id: 'p-path', label: 'Path', type: 'text', value: p.path }
  ], (values) => {
    p.name = values['p-name'] || p.name;
    p.description = values['p-desc'] || '';
    p.path = values['p-path'] || '';
    saveConfig();
    renderProjects();
    showToast('Project updated', 'success');
  });
};

window.deleteProject = function(id) {
  YEET.config.projects = YEET.config.projects.filter(x => x.id !== id);
  saveConfig();
  renderProjects();
  addLog('info', 'Project deleted');
};

window.openProjectFolder = function(id) {
  const p = YEET.config.projects.find(x => x.id === id);
  if (!p) return;
  addLog('info', `Opening folder: ${p.path}`);
  showToast('Opening folder...', 'info');
};

window.openProjectGithub = function(id) {
  const p = YEET.config.projects.find(x => x.id === id);
  if (!p) return;
  let githubUrl = '';
  
  switch(p.name) {
    case 'Fadeolog System':
      githubUrl = 'https://github.com/yeetozer/fadeolog-frontend';
      break;
    case 'Yigit Map System':
      githubUrl = 'https://github.com/yeetozer/yeets-map';
      break;
    case 'HPE Gromme Tryout':
      githubUrl = 'https://github.com/yeetozer/hpe-gromme-tryout';
      break;
    case 'PM Dev Roadmap':
      githubUrl = 'https://github.com/yeetozer/pm-dev-roadmap';
      break;
    default:
      showToast('No GitHub link configured', 'warning');
      return;
  }
  
  if (githubUrl) {
    window.open(githubUrl, '_blank');
    addLog('info', `Opening GitHub: ${githubUrl}`);
  }
};

function updateProjectMetrics() {
  // Simulate resource updates for running projects
  YEET.config.projects.forEach(p => {
    if (p.status === 'running') {
      p.cpu = Math.max(1, Math.min(100, (p.cpu || 10) + (Math.random() * 10 - 5)));
      p.mem = Math.max(1, Math.min(100, (p.mem || 5) + (Math.random() * 5 - 2.5)));
    } else {
      p.cpu = 0;
      p.mem = 0;
    }
  });
  renderProjects();
}

function showAddProjectModal() {
  createModal('Add Project', [
    { id: 'p-name', label: 'Name', type: 'text' },
    { id: 'p-desc', label: 'Description', type: 'textarea' },
    { id: 'p-path', label: 'Path', type: 'text' }
  ], (values) => {
    const proj = {
      id: Date.now().toString(),
      name: values['p-name'] || 'Untitled',
      description: values['p-desc'] || '',
      path: values['p-path'] || '',
      tags: []
    };
    YEET.config.projects.push(proj);
    saveConfig();
    renderProjects();
    showToast('Project added', 'success');
  });
}

/* ===== NETWORK MONITORING ===== */
async function checkNetworkStatus() {
  const services = [
    { name: 'OpenClaw Gateway', url: 'http://localhost:3000', status: 'unknown' },
    { name: 'Ollama', url: 'http://localhost:11434', status: 'unknown' },
    { name: 'Dashboard', url: 'http://localhost:8080', status: 'unknown' },
    { name: 'Fadeolog', url: 'http://localhost:3000', status: 'unknown' },
    { name: 'Yigit Map', url: 'http://localhost:3001', status: 'unknown' }
  ];
  
  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(service.url, { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeout);
      service.status = 'online';
    } catch (err) {
      service.status = 'offline';
    }
  }
  
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

/* ===== MODAL ===== */
function createModal(title, fields, onSubmit) {
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const inputsHtml = fields.map(f => `
    <label>${f.label}</label>
    ${f.type === 'textarea'
      ? `<textarea id="${f.id}" rows="3">${f.value || ''}</textarea>`
      : `<input type="${f.type}" id="${f.id}" value="${f.value || ''}">`
    }
  `).join('');

  overlay.innerHTML = `
    <div class="modal">
      <h3>${escapeHtml(title)}</h3>
      <div class="modal-form">
        ${inputsHtml}
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm">Save</button>
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

/* ===== SYSTEM DETECTION ===== */
function detectSystem() {
  YEET.state.platform = navigator.platform || 'unknown';
  YEET.state.hostname = window.location.hostname || 'localhost';

  document.getElementById('hostname').textContent = YEET.state.hostname;
  document.getElementById('platform').textContent = YEET.state.platform;
}

/* ===== UTILS ===== */
function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h ${min % 60}m`;
  if (hr > 0) return `${hr}h ${min % 60}m ${sec % 60}s`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===== TOAST ===== */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
