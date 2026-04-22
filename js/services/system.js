/* ===== SYSTEM METRICS SERVICE ===== */

import { cacheGet, cacheSet, setGauge } from '../utils/helpers.js';

export async function fetchSystemMetric(type) {
  const cacheKey = `sys_${type}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Mock data for now - in production, this would fetch from a system API
  let data;
  switch(type) {
    case 'cpu':
      data = { usage: Math.floor(Math.random() * 30) + 10 };
      break;
    case 'memory':
      data = { used: 4.2, total: 16 };
      break;
    case 'disk':
      data = { used: 45, total: 100 };
      break;
    case 'processes':
      data = [
        { pid: 54922, name: 'python3', cpu: '2.1', mem: '1.2' },
        { pid: 54894, name: 'node', cpu: '5.4', mem: '3.8' },
        { pid: 1, name: 'systemd', cpu: '0.1', mem: '0.5' },
        { pid: 1234, name: 'ollama', cpu: '12.3', mem: '8.2' }
      ];
      break;
    default:
      data = {};
  }
  cacheSet(cacheKey, data, 10000);
  return data;
}

export async function loadSystemMetrics() {
  try {
    // Load all metrics in parallel with Promise.all
    const [cpuData, memData, diskData, processes] = await Promise.all([
      fetchSystemMetric('cpu'),
      fetchSystemMetric('memory'),
      fetchSystemMetric('disk'),
      fetchSystemMetric('processes')
    ]);

    updateCpuGauge(cpuData.usage);
    updateMemoryGauge(memData.used, memData.total);
    updateDiskGauge(diskData.used, diskData.total);
    renderProcesses(processes);

    // Use the shared addLog if available, else console
    if (typeof addLog === 'function') {
      addLog('info', 'System metrics updated');
    }
  } catch (err) {
    if (typeof addLog === 'function') {
      addLog('error', `Metrics failed: ${err.message}`);
    } else {
      console.error('Metrics failed:', err);
    }
  }
}

function updateCpuGauge(usage) {
  const gauge = document.getElementById('cpu-gauge');
  const value = document.getElementById('cpu-value');
  if (!gauge || !value) return;

  gauge.style.setProperty('--value', `${usage}%`);
  value.textContent = `${usage}%`;

  if (usage > 80) {
    gauge.classList.add('critical');
    gauge.classList.remove('warning');
  } else if (usage > 60) {
    gauge.classList.add('warning');
    gauge.classList.remove('critical');
  } else {
    gauge.classList.remove('critical', 'warning');
  }
}

function updateMemoryGauge(used, total) {
  // Fixed: use memory-gauge (not mem-gauge) to match index.html
  const gauge = document.getElementById('memory-gauge');
  const value = document.getElementById('memory-value');
  const details = document.getElementById('memory-details');
  if (!gauge || !value || !details) return;

  const percent = Math.round((used / total) * 100);
  gauge.style.setProperty('--value', `${percent}%`);
  value.textContent = `${percent}%`;
  details.textContent = `${used} / ${total} GB`;

  if (percent > 80) {
    gauge.classList.add('critical');
    gauge.classList.remove('warning');
  } else if (percent > 60) {
    gauge.classList.add('warning');
    gauge.classList.remove('critical');
  } else {
    gauge.classList.remove('critical', 'warning');
  }
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

  if (percent > 80) {
    gauge.classList.add('critical');
    gauge.classList.remove('warning');
  } else if (percent > 60) {
    gauge.classList.add('warning');
    gauge.classList.remove('critical');
  } else {
    gauge.classList.remove('critical', 'warning');
  }
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

// Provide local escapeHtml if not imported
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
