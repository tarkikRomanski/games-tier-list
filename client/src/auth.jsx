import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [providers, setProviders] = useState({ google: false });

  useEffect(() => {
    api.get('/auth/me').then(
      (r) => setUser(r.user),
      () => setUser(null),
    );
    api.get('/auth/providers').then(setProviders, () => {});
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    setUser(r.user);
  }, []);
  const register = useCallback(async (username, password) => {
    const r = await api.post('/auth/register', { username, password });
    setUser(r.user);
  }, []);
  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);
  /** Keeps the header in sync after the profile is edited. */
  const updateUser = useCallback((fields) => setUser((u) => (u ? { ...u, ...fields } : u)), []);

  const value = useMemo(
    () => ({ user, loading: user === undefined, providers, login, register, logout, updateUser }),
    [user, providers, login, register, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
