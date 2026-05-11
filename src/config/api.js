const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

function normalizeBaseUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error(
      'Missing EXPO_PUBLIC_API_BASE_URL. Set it to your hosted backend base URL, e.g. https://api.tasktuto.com/api'
    );
  }

  const trimmed = raw.trim().replace(/\/+$/, '');

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid EXPO_PUBLIC_API_BASE_URL: "${raw}". Expected a full https URL like https://api.tasktuto.com/api`
    );
  }

  const host = url.hostname?.toLowerCase?.() || '';
  const isLocalhost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);

  if (url.protocol !== 'https:') {
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL must use https in production. Got: ${url.protocol}//${url.host}`
    );
  }

  if (isLocalhost) {
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL must not point to localhost/private IPs for EAS builds. Got host: ${url.host}`
    );
  }

  return url.toString().replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

function joinUrl(base, path) {
  if (!path) return base;
  const p = String(path);
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (p.startsWith('/')) return `${base}${p}`;
  return `${base}/${p}`;
}

async function safeReadJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Minimal API client with consistent logging + error handling.
 * - Adds Authorization header when token is provided.
 * - Converts non-2xx responses into a thrown Error with status attached.
 */
export async function apiRequest(path, { method = 'GET', token, headers, body } = {}) {
  const url = joinUrl(API_BASE_URL, path);

  const reqHeaders = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  console.log('[API REQUEST]', method, url);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const e = new Error('Network error. Please check your internet connection.');
    e.cause = err;
    throw e;
  }

  const data = await safeReadJson(res);

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed with status ${res.status}`;
    const e = new Error(message);
    e.status = res.status;
    e.data = data;
    throw e;
  }

  return data;
}

