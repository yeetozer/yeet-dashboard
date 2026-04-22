/* ===== CONFIGURATION ===== */

// API Configuration - Tokens loaded from env.js (not committed)
export const CLOUDFLARE = {
  token: '',
  zoneId: ''
};

export const DOKPLOY = {
  url: '',
  apiKey: ''
};

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

// API Base URLs
export const API_BASE = {
  cloudflare: 'https://api.cloudflare.com/client/v4',
  dokploy: '/api/proxy/dokploy' // Proxied through backend
};

// Cache configuration
export const CACHE = {
  enabled: true,
  ttl: 30000, // 30 seconds
  maxSize: 50
};
