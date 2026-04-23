import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(__dirname, 'config.json');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const FETCH_TIMEOUT_MS = 10000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || `yeet-admin-${Math.random().toString(36).slice(2)}`;

const defaultConfig = {
  dokployUrl: process.env.DOKPLOY_URL || '',
  dokployApiKey: process.env.DOKPLOY_API_KEY || '',
  cloudflareToken: process.env.CLOUDFLARE_TOKEN || '',
  cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID || ''
};

let runtimeConfig = { ...defaultConfig };

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'https://wttr.in'],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '50kb' }));

function requireEnv(keys) {
  const source = mapConfigToEnvLike();
  const missing = keys.filter((key) => !source[key]);
  if (missing.length > 0) {
    const error = new Error(`Missing required settings: ${missing.join(', ')}`);
    error.status = 500;
    throw error;
  }
}

function mapConfigToEnvLike() {
  return {
    DOKPLOY_URL: runtimeConfig.dokployUrl,
    DOKPLOY_API_KEY: runtimeConfig.dokployApiKey,
    CLOUDFLARE_TOKEN: runtimeConfig.cloudflareToken,
    CLOUDFLARE_ZONE_ID: runtimeConfig.cloudflareZoneId
  };
}

function sanitizeConfig(config) {
  return {
    configured: {
      dokploy: Boolean(config.dokployUrl && config.dokployApiKey),
      cloudflare: Boolean(config.cloudflareToken && config.cloudflareZoneId)
    },
    dokployUrl: config.dokployUrl || '',
    cloudflareZoneId: config.cloudflareZoneId || '',
    hasDokployApiKey: Boolean(config.dokployApiKey),
    hasCloudflareToken: Boolean(config.cloudflareToken)
  };
}

function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function sanitizeErrorForLog(error, fallback = 'Unexpected error') {
  if (!error || typeof error !== 'object') return fallback;
  if (typeof error.status === 'number' && error.status < 500 && error.message) {
    return error.message;
  }
  if (error.name === 'AbortError') return 'Upstream request timed out';
  return fallback;
}

async function ensureConfigPermissions() {
  try {
    await fs.chmod(configPath, 0o600);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function loadConfigFromDisk() {
  try {
    await ensureConfigPermissions();
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    runtimeConfig = { ...defaultConfig, ...parsed };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[proxy] Failed to load config.json');
    }
  }
}

async function saveConfigToDisk(config) {
  runtimeConfig = { ...runtimeConfig, ...config };
  await fs.writeFile(configPath, `${JSON.stringify(runtimeConfig, null, 2)}\n`, 'utf8');
  await ensureConfigPermissions();
}

async function clearConfigFromDisk() {
  runtimeConfig = { ...defaultConfig };

  try {
    await fs.unlink(configPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        const error = new Error('Upstream returned invalid JSON');
        error.status = 502;
        throw error;
      }
    }

    if (!response.ok) {
      const detail = data?.errors?.[0]?.message || data?.message || `Upstream request failed with status ${response.status}`;
      const error = new Error(detail);
      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Upstream request timed out');
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/settings', requireAuth, (_req, res) => {
  res.json(sanitizeConfig(runtimeConfig));
});

app.post('/api/settings', requireAuth, async (req, res, next) => {
  try {
    const nextConfig = {
      dokployUrl: typeof req.body.dokployUrl === 'string' ? req.body.dokployUrl.trim() : runtimeConfig.dokployUrl,
      dokployApiKey: typeof req.body.dokployApiKey === 'string' ? req.body.dokployApiKey.trim() : runtimeConfig.dokployApiKey,
      cloudflareToken: typeof req.body.cloudflareToken === 'string' ? req.body.cloudflareToken.trim() : runtimeConfig.cloudflareToken,
      cloudflareZoneId: typeof req.body.cloudflareZoneId === 'string' ? req.body.cloudflareZoneId.trim() : runtimeConfig.cloudflareZoneId
    };

    await saveConfigToDisk(nextConfig);
    res.json({ ok: true, ...sanitizeConfig(runtimeConfig) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/settings/clear', requireAuth, async (_req, res, next) => {
  try {
    await clearConfigFromDisk();
    res.json({ ok: true, ...sanitizeConfig(runtimeConfig) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dokploy/projects', async (_req, res, next) => {
  try {
    requireEnv(['DOKPLOY_URL', 'DOKPLOY_API_KEY']);
    const baseUrl = runtimeConfig.dokployUrl.replace(/\/$/, '');
    const data = await fetchJson(`${baseUrl}/api/project.all`, {
      headers: {
        'x-api-key': runtimeConfig.dokployApiKey
      }
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/cloudflare/dns', async (_req, res, next) => {
  try {
    requireEnv(['CLOUDFLARE_TOKEN', 'CLOUDFLARE_ZONE_ID']);
    const data = await fetchJson(`https://api.cloudflare.com/client/v4/zones/${runtimeConfig.cloudflareZoneId}/dns_records?per_page=100`, {
      headers: {
        authorization: `Bearer ${runtimeConfig.cloudflareToken}`,
        'content-type': 'application/json'
      }
    });

    if (!data?.success) {
      const error = new Error(data?.errors?.[0]?.message || 'Cloudflare API error');
      error.status = 502;
      throw error;
    }

    res.json(data.result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/cloudflare/zones', async (_req, res, next) => {
  try {
    requireEnv(['CLOUDFLARE_TOKEN']);
    const data = await fetchJson('https://api.cloudflare.com/client/v4/zones', {
      headers: {
        authorization: `Bearer ${runtimeConfig.cloudflareToken}`,
        'content-type': 'application/json'
      }
    });

    if (!data?.success) {
      const error = new Error(data?.errors?.[0]?.message || 'Cloudflare API error');
      error.status = 502;
      throw error;
    }

    res.json(data.result);
  } catch (error) {
    next(error);
  }
});

app.use(express.static(rootDir, {
  extensions: ['html'],
  index: 'index.html'
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(path.join(rootDir, 'index.html'));
});

app.use((err, _req, res, _next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = status >= 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    console.error(`[proxy] ${sanitizeErrorForLog(err, 'Internal server error')}`);
  }

  res.status(status).json({
    error: message
  });
});

loadConfigFromDisk().finally(() => {
  app.listen(PORT, () => {
    console.log(`[proxy] Yeet Dashboard proxy listening on http://localhost:${PORT}`);
    if (!process.env.ADMIN_TOKEN) {
      console.log('[proxy] ADMIN_TOKEN not set; generated ephemeral admin token for this process');
    }
  });
});
