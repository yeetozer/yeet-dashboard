/* ===== ENV LOADER ===== */
// Secrets are now server-side only. This module remains as a no-op shim
// so older imports fail safely until they are removed.

export async function loadEnv() {
  return undefined;
}

export function getEnv(_key, fallback = '') {
  return fallback;
}
