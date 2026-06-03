import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE    = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'dental_auth_user';

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000 - 30_000; // 30s margin
  } catch { return true; }
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(loadStoredUser);
  const [authReady, setAuthReady] = useState(false);

  const persist = (u) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
    setUser(u);
  };

  // On mount: if stored token is expired, try silent refresh via httpOnly cookie
  useEffect(() => {
    const stored = loadStoredUser();
    if (!stored?.token || !isTokenExpired(stored.token)) {
      setAuthReady(true);
      return;
    }
    fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (r) => {
        if (r.ok) { const data = await r.json(); persist(data); }
        else persist(null);
      })
      .catch(() => persist(null))
      .finally(() => setAuthReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Login failed');
    persist(data);
    return data;
  }, []);

  const register = useCallback(async (fields) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Registration failed');
    persist(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    persist(null);
  }, []);

  // Used by alternative auth flows (e.g. OTP) that already have the user payload
  const loginWithData = useCallback((data) => {
    persist(data);
    return data;
  }, []);

  const hasPermission = useCallback(
    (perm) => user?.permissions?.includes(perm) ?? false,
    [user]
  );

  const isAdmin = user?.role === 'admin';

  // Inactivity timeout
  useEffect(() => {
    if (!user) return;
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { logout(); alert('Ai fost deconectat din cauza inactivității.'); }, INACTIVITY_LIMIT);
    };
    resetTimer();
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, authReady, login, loginWithData, register, logout, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
