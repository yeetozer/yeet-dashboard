import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const FETCH_TIMEOUT_MS = 10000;

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
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    error.status = 500;
    throw error;
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

app.get('/api/dokploy/projects', async (_req, res, next) => {
  try {
    requireEnv(['DOKPLOY_URL', 'DOKPLOY_API_KEY']);
    const baseUrl = process.env.DOKPLOY_URL.replace(/\/$/, '');
    const data = await fetchJson(`${baseUrl}/api/project.all`, {
      headers: {
        'x-api-key': process.env.DOKPLOY_API_KEY
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
    const data = await fetchJson(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records?per_page=100`, {
      headers: {
        authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
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
        authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
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
    console.error(`[proxy] ${err.message}`);
  }

  res.status(status).json({
    error: message
  });
});

app.listen(PORT, () => {
  console.log(`[proxy] Yeet Dashboard proxy listening on http://localhost:${PORT}`);
});
