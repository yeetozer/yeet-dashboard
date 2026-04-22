/* ===== ENV LOADER ===== */
// Loads API tokens from env.js (gitignored) at runtime

let _loaded = false;

export async function loadEnv() {
  if (_loaded) return;
  try {
    const response = await fetch('./env.js');
    if (!response.ok) {
      console.warn('env.js not found - API calls may fail');
      return;
    }
    const script = await response.text();
    // Parse window.YEET_ENV = { ... }
    const match = script.match(/window\.YEET_ENV\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      const env = JSON.parse(match[1]);
      window.YEET_ENV = env;
    }
  } catch (err) {
    console.warn('Failed to load env.js:', err.message);
  }
  _loaded = true;
}

export function getEnv(key, fallback = '') {
  if (typeof window !== 'undefined' && window.YEET_ENV) {
    return window.YEET_ENV[key] ?? fallback;
  }
  return fallback;
}
