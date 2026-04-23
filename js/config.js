/* ===== CONFIGURATION ===== */

export const YEET = {
  config: {
    refreshInterval: 30000,
    autoRefresh: true,
    sessionFiles: [],
    projects: [],
    todos: [],
    bookmarks: [],
    focus: '',
    weatherCity: 'Istanbul',
    userName: 'Yigit',
    rememberApiKeys: false,
    apiSettings: {
      dokployUrl: '',
      dokployApiKey: '',
      cloudflareToken: '',
      cloudflareZoneId: ''
    }
  },
  state: {
    lastUpdate: null,
    logs: [],
    isPaused: false,
    timerId: null,
    hostname: 'localhost',
    platform: 'unknown',
    apiSettingsMemory: null,
    proxyConfigStatus: null
  }
};

// API Base URLs
export const API_BASE = {
  cloudflareDns: '/api/cloudflare/dns',
  cloudflareZones: '/api/cloudflare/zones',
  dokployProjects: '/api/dokploy/projects'
};

// Cache configuration
export const CACHE = {
  enabled: true,
  ttl: 30000, // 30 seconds
  maxSize: 50
};
