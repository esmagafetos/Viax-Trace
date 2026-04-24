import * as SecureStore from 'expo-secure-store';

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const SESSION_KEY = 'viax_session_cookie';
const API_URL_KEY = 'viax_api_url';

let cachedApiUrl: string = DEFAULT_API_URL;

function normalizeUrl(raw: string): string {
  let v = raw.trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
  return v.replace(/\/+$/, '');
}

export async function initApiUrl(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(API_URL_KEY);
    if (stored) cachedApiUrl = stored;
  } catch {
    // ignore
  }
}

export function getApiUrl(): string {
  return cachedApiUrl;
}

export function hasApiUrl(): boolean {
  return Boolean(cachedApiUrl);
}

export async function setApiUrl(value: string): Promise<string> {
  const normalized = normalizeUrl(value);
  cachedApiUrl = normalized;
  try {
    if (normalized) await SecureStore.setItemAsync(API_URL_KEY, normalized);
    else await SecureStore.deleteItemAsync(API_URL_KEY);
  } catch {
    // ignore
  }
  return normalized;
}

export async function testApiUrl(value: string): Promise<{ ok: boolean; status?: number; message?: string }> {
  const url = normalizeUrl(value);
  if (!url) return { ok: false, message: 'URL vazia' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${url}/api/healthz`, { method: 'GET', signal: ctrl.signal });
    clearTimeout(t);
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? 'Falha de conexão' };
  }
}

async function getSession(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

async function setSession(value: string | null): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(SESSION_KEY, value);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getApiUrl();
  if (!base && !path.startsWith('http')) {
    throw new Error('Servidor não configurado. Configure em Ajustes → API.');
  }
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const cookie = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const sid = setCookie.split(';')[0];
    await setSession(sid);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function clearSession(): Promise<void> {
  await setSession(null);
}

/** Uploads an avatar image via multipart/form-data to /api/users/avatar. */
export async function uploadAvatar(localUri: string, mimeType: string, fileName: string): Promise<{ avatarUrl: string }> {
  const base = getApiUrl();
  if (!base) throw new Error('Servidor não configurado.');
  const cookie = await getSession();

  const form = new FormData();
  // React Native FormData accepts { uri, name, type } as a "file"
  form.append('avatar', {
    uri: localUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(`${base}/api/users/avatar`, {
    method: 'POST',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      Accept: 'application/json',
      // NB: do NOT set Content-Type — RN auto-sets the multipart boundary
    },
    body: form as any,
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const sid = setCookie.split(';')[0];
    await setSession(sid);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as { avatarUrl: string };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
