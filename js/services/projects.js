/* ===== PROJECTS SERVICE ===== */

import { YEET } from '../config.js';
import { escapeHtml, showToast, createModal, addLog } from '../utils/helpers.js';

export function initProjects() {
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

export function renderProjects() {
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
            <div class="sub-item"><span class="sub-dot frontend"></span><span>Frontend: Next.js (Port 3000)</span></div>
            <div class="sub-item"><span class="sub-dot backend"></span><span>Backend: Django API (Port 8000)</span></div>
          </div>`;
      } else if (p.name.includes('Yigit Map')) {
        subProjects = `
          <div class="project-sub">
            <div class="sub-item"><span class="sub-dot frontend"></span><span>Web: Next.js + Leaflet</span></div>
            <div class="sub-item"><span class="sub-dot backend"></span><span>Mobile: Expo + MapLibre</span></div>
          </div>`;
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
          <div class="resource-track"><div class="resource-fill" style="width: ${p.cpu || 0}%; background: ${(p.cpu || 0) > 80 ? 'var(--accent-red)' : (p.cpu || 0) > 60 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div></div>
          <span class="resource-value">${p.cpu || 0}%</span>
        </div>
        <div class="resource-bar">
          <span class="resource-label">MEM</span>
          <div class="resource-track"><div class="resource-fill" style="width: ${p.mem || 0}%; background: ${(p.mem || 0) > 80 ? 'var(--accent-red)' : (p.mem || 0) > 60 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div></div>
          <span class="resource-value">${p.mem || 0}%</span>
        </div>
      </div>
      <div class="project-tags">${(p.tags || []).map(t => `<span class="project-tag tag-${t}">${t}</span>`).join('')}</div>
      <div class="project-meta"><span>${escapeHtml(p.path || '')}</span></div>
      <div class="project-actions">
        <button class="btn btn-sm" onclick="openProjectFolder('${p.id}')" title="Open Folder">📁</button>
        <button class="btn btn-sm" onclick="openProjectGithub('${p.id}')" title="GitHub">🐙</button>
        <button class="btn btn-sm" onclick="editProject('${p.id}')">Edit</button>
        <button class="btn btn-sm" onclick="deleteProject('${p.id}')" style="color: var(--accent-red);">Delete</button>
      </div>
    </div>`;
  }).join('');
}

/* ===== TOGGLE PROJECT STATUS (FIXED) ===== */
window.toggleProjectStatus = function(id) {
  const p = YEET.config.projects.find(x => x.id === id);
  if (!p) return;

  // Toggle status
  p.status = p.status === 'running' ? 'stopped' : 'running';

  // Reset or set mock metrics
  if (p.status === 'running') {
    p.cpu = Math.floor(Math.random() * 20) + 5;
    p.mem = Math.floor(Math.random() * 15) + 3;
    showToast(`${p.name} started on port ${p.port}`, 'success');
  } else {
    p.cpu = 0;
    p.mem = 0;
    showToast(`${p.name} stopped`, 'info');
  }

  saveConfig();
  renderProjects();
};

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

export function updateProjectMetrics() {
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

function saveConfig() {
  localStorage.setItem('yeet-projects', JSON.stringify(YEET.config.projects));
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

