/* ===== PROJECTS SERVICE ===== */

import { YEET, API_BASE } from '../config.js';
import { escapeHtml, showToast, createModal, addLog, cacheGet, cacheSet } from '../utils/helpers.js';

export async function initProjects() {
  const saved = localStorage.getItem('yeet-projects');
  if (saved) {
    YEET.config.projects = JSON.parse(saved);
  } else {
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

  // Fetch real Dokploy data
  await syncDokployStatus();
  
  renderProjects();
  document.getElementById('add-project-btn')?.addEventListener('click', showAddProjectModal);
}

async function syncDokployStatus() {
  try {
    const cacheKey = 'dk_real_status';
    const cached = cacheGet(cacheKey);
    if (cached) {
      applyDokployStatus(cached);
      return;
    }

    const res = await fetch(API_BASE.dokployProjects, {
      headers: { accept: 'application/json' }
    });
    
    if (!res.ok) throw new Error(`Dokploy API error: ${res.status}`);
    
    const dokployProjects = await res.json();
    cacheSet(cacheKey, dokployProjects, 60000); // Cache for 1 minute
    applyDokployStatus(dokployProjects);
    addLog('info', `Synced ${dokployProjects.length} projects from Dokploy`);
  } catch (err) {
    addLog('warn', `Dokploy sync failed: ${err.message}`);
    // Keep existing local status
  }
}

function applyDokployStatus(dokployProjects) {
  // Map Dokploy projects to local projects
  const projectMap = {
    'Yeets-Map': ['Yigit Map System'],
    'Fadeolog': ['Fadeolog System'],
    'yigitsolutions': ['Yigit Solutions'],
    'BoulderJungle-System': ['BoulderJungle-System'],
    'Garmentic-Website': ['Garmentic-Website'],
    'zonanatura': ['zonanatura']
  };

  dokployProjects.forEach((dpProject) => {
    const env = dpProject.environments?.[0] || {};
    const apps = env.applications || [];
    const appStatus = apps.length > 0 ? 'running' : 'stopped';
    
    // Check if any app is actually building/deploying
    const isBuilding = apps.some((app) => app.buildStatus === 'running');
    const hasFailed = apps.some((app) => app.buildStatus === 'failed' || app.status === 'error');
    
    let finalStatus = appStatus;
    if (isBuilding) finalStatus = 'building';
    if (hasFailed) finalStatus = 'error';
    
    // Find matching local projects
    const localNames = projectMap[dpProject.name] || [];
    localNames.forEach((localName) => {
      const localProject = YEET.config.projects.find((p) => p.name === localName);
      if (localProject) {
        localProject.status = finalStatus;
        localProject.dokployStatus = finalStatus;
        localProject.dokployProject = dpProject.name;
        localProject.apps = apps.length;
        
        // Get metrics from first app if available
        if (apps.length > 0 && apps[0].cpuLimit) {
          localProject.cpu = Math.round((apps[0].cpuUsage || 0) / apps[0].cpuLimit * 100);
          localProject.mem = Math.round((apps[0].memoryUsage || 0) / apps[0].memoryLimit * 100);
        }
        
        // Get port from app
        if (apps.length > 0 && apps[0].ports?.length > 0) {
          localProject.port = apps[0].ports[0].publishedPort || apps[0].ports[0].port;
        }
      }
    });
  });
  
  // Save updated status
  localStorage.setItem('yeet-projects', JSON.stringify(YEET.config.projects));
}

export function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (YEET.config.projects.length === 0) {
    grid.innerHTML = '<p class="empty-state">No projects yet. Click Add Project to get started.</p>';
    return;
  }

  grid.innerHTML = YEET.config.projects.map((project) => {
    const isSystem = project.tags?.includes('fullstack');
    const isRunning = project.status === 'running';
    const gitStatus = project.gitStatus || 'unknown';
    const gitIcon = gitStatus === 'clean'
      ? '✓'
      : gitStatus === 'modified'
        ? '!'
        : gitStatus === 'ahead'
          ? '↑'
          : gitStatus === 'behind'
            ? '↓'
            : '?';

    let subProjects = '';
    if (isSystem) {
      if (project.name.includes('Fadeolog')) {
        subProjects = `
          <div class="project-subgrid">
            <div class="sub-item"><span class="sub-dot frontend"></span><span>Frontend: Next.js on port 3000</span></div>
            <div class="sub-item"><span class="sub-dot backend"></span><span>Backend: Django API on port 8000</span></div>
          </div>
        `;
      } else if (project.name.includes('Yigit Map')) {
        subProjects = `
          <div class="project-subgrid">
            <div class="sub-item"><span class="sub-dot frontend"></span><span>Web: Next.js + Leaflet</span></div>
            <div class="sub-item"><span class="sub-dot backend"></span><span>Mobile: Expo + MapLibre</span></div>
          </div>
        `;
      }
    }

    const dokployStatus = project.dokployStatus || project.status;
    const statusClass = dokployStatus === 'running' ? 'running' : 
                       dokployStatus === 'building' ? 'building' :
                       dokployStatus === 'error' ? 'error' : 'stopped';
    const statusText = dokployStatus === 'running' ? 'Running' :
                       dokployStatus === 'building' ? 'Building' :
                       dokployStatus === 'error' ? 'Error' : 'Stopped';

    return `
      <article class="project-card ${isSystem ? 'system-card' : ''}" data-id="${project.id}">
        <div class="project-card-top">
          <div class="project-card-copy">
            <span class="project-kicker">${isSystem ? 'Full stack system' : 'Tracked repository'}</span>
            <h4>${escapeHtml(project.name)}</h4>
            <p>${escapeHtml(project.description || '')}</p>
          </div>
          <div class="project-health">
            <span class="project-health-pill ${statusClass}">${statusText}</span>
            <span class="project-health-pill git-${gitStatus}">${gitIcon} ${gitStatus}</span>
          </div>
        </div>

        <div class="project-telemetry">
          <div class="project-inline-metric">
            <span>Port</span>
            <strong>${project.port || '—'}</strong>
          </div>
          <div class="project-inline-metric">
            <span>Last Commit</span>
            <strong>${escapeHtml(project.lastCommit || '—')}</strong>
          </div>
          <div class="project-inline-metric">
            <span>Path</span>
            <strong title="${escapeHtml(project.path || '')}">${escapeHtml(project.path || '—')}</strong>
          </div>
        </div>

        ${subProjects}

        <div class="project-resources">
          <div class="resource-bar">
            <span class="resource-label">CPU</span>
            <div class="resource-track">
              <div class="resource-fill" style="width: ${project.cpu || 0}%; background: ${resourceColor(project.cpu || 0)}"></div>
            </div>
            <span class="resource-value">${Math.round(project.cpu || 0)}%</span>
          </div>
          <div class="resource-bar">
            <span class="resource-label">MEM</span>
            <div class="resource-track">
              <div class="resource-fill" style="width: ${project.mem || 0}%; background: ${resourceColor(project.mem || 0)}"></div>
            </div>
            <span class="resource-value">${Math.round(project.mem || 0)}%</span>
          </div>
        </div>

        <div class="project-tags">${(project.tags || []).map((tag) => `<span class="project-tag tag-${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join('')}</div>

        <div class="project-actions">
          <button class="btn btn-sm ${isRunning ? 'btn-stop' : 'btn-start'}" type="button" onclick="toggleProjectStatus('${project.id}')">
            ${isRunning ? 'Stop' : 'Start'}
          </button>
          ${project.port ? `<a href="http://localhost:${project.port}" target="_blank" rel="noopener noreferrer" class="btn btn-sm">Open</a>` : ''}
          <button class="btn btn-sm" type="button" onclick="openProjectFolder('${project.id}')" aria-label="Open project folder">Folder</button>
          <button class="btn btn-sm" type="button" onclick="openProjectGithub('${project.id}')" aria-label="Open project GitHub link">GitHub</button>
          <button class="btn btn-sm" type="button" onclick="editProject('${project.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" type="button" onclick="deleteProject('${project.id}')">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

window.toggleProjectStatus = function toggleProjectStatus(id) {
  const project = YEET.config.projects.find((item) => item.id === id);
  if (!project) return;

  project.status = project.status === 'running' ? 'stopped' : 'running';
  if (project.status === 'running') {
    project.cpu = Math.floor(Math.random() * 20) + 5;
    project.mem = Math.floor(Math.random() * 15) + 3;
    showToast(`${project.name} started${project.port ? ` on port ${project.port}` : ''}`, 'success');
  } else {
    project.cpu = 0;
    project.mem = 0;
    showToast(`${project.name} stopped`, 'info');
  }

  saveConfig();
  renderProjects();
  emitProjectsUpdated();
};

window.editProject = function editProject(id) {
  const project = YEET.config.projects.find((item) => item.id === id);
  if (!project) return;

  createModal('Edit Project', [
    { id: 'p-name', label: 'Name', type: 'text', value: project.name },
    { id: 'p-desc', label: 'Description', type: 'textarea', value: project.description },
    { id: 'p-path', label: 'Path', type: 'text', value: project.path }
  ], (values) => {
    project.name = values['p-name'] || project.name;
    project.description = values['p-desc'] || '';
    project.path = values['p-path'] || '';
    saveConfig();
    renderProjects();
    emitProjectsUpdated();
    showToast('Project updated', 'success');
  });
};

window.deleteProject = function deleteProject(id) {
  YEET.config.projects = YEET.config.projects.filter((item) => item.id !== id);
  saveConfig();
  renderProjects();
  emitProjectsUpdated();
  addLog('info', 'Project deleted');
};

window.openProjectFolder = function openProjectFolder(id) {
  const project = YEET.config.projects.find((item) => item.id === id);
  if (!project) return;
  addLog('info', `Opening folder: ${project.path}`);
  showToast('Opening folder...', 'info');
};

window.openProjectGithub = function openProjectGithub(id) {
  const project = YEET.config.projects.find((item) => item.id === id);
  if (!project) return;

  let githubUrl = '';
  switch (project.name) {
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

  window.open(githubUrl, '_blank');
  addLog('info', `Opening GitHub: ${githubUrl}`);
};

export function updateProjectMetrics() {
  YEET.config.projects.forEach((project) => {
    if (project.status === 'running') {
      project.cpu = Math.max(1, Math.min(100, (project.cpu || 10) + (Math.random() * 10 - 5)));
      project.mem = Math.max(1, Math.min(100, (project.mem || 5) + (Math.random() * 5 - 2.5)));
    } else {
      project.cpu = 0;
      project.mem = 0;
    }
  });
  renderProjects();
  emitProjectsUpdated();
}

function showAddProjectModal() {
  createModal('Add Project', [
    { id: 'p-name', label: 'Name', type: 'text' },
    { id: 'p-desc', label: 'Description', type: 'textarea' },
    { id: 'p-path', label: 'Path', type: 'text' }
  ], (values) => {
    const project = {
      id: Date.now().toString(),
      name: values['p-name'] || 'Untitled',
      description: values['p-desc'] || '',
      path: values['p-path'] || '',
      tags: []
    };
    YEET.config.projects.push(project);
    saveConfig();
    renderProjects();
    emitProjectsUpdated();
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

function emitProjectsUpdated() {
  document.dispatchEvent(new CustomEvent('projects-updated'));
}

function resourceColor(value) {
  if (value > 80) return 'var(--accent-red)';
  if (value > 60) return 'var(--accent-yellow)';
  return 'var(--accent-green)';
}
