const STORAGE_KEY = 'dental_auth_user';
const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthToken = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch { return null; }
};

const updateStoredToken = (data) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, ...data }));
  } catch {}
};

let refreshPromise = null; // deduplicate concurrent refresh calls

const tryRefresh = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) throw new Error('refresh failed');
      const data = await r.json();
      updateStoredToken(data);
      return data.token;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
};

export const fetchWithAuth = async (url, options = {}, _retry = true) => {
  const token = getAuthToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && _retry) {
    try {
      const newToken = await tryRefresh();
      headers['Authorization'] = `Bearer ${newToken}`;
      return fetch(fullUrl, { ...options, headers, credentials: 'include' });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.location.href = '/login';
    }
  }

  return res;
};
