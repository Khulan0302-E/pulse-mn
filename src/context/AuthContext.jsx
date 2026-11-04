import { createContext, useContext, useState, useCallback } from 'react';
import { useDb } from '../lib/useDb';
import { SESSION_KEY } from '../lib/db';
import { login as apiLogin, register as apiRegister } from '../api/auth';

const AuthCtx = createContext(null);

function readSession() {
  try {
    return Number(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const db = useDb();
  const [sessionId, setSessionId] = useState(readSession);
  // Түдгэлзсэн хэрэглэгч автоматаар гарна
  const user = sessionId ? db.users.find((u) => u.id === sessionId && u.status === 'active') || null : null;

  const start = (u) => {
    localStorage.setItem(SESSION_KEY, String(u.id));
    setSessionId(u.id);
    return u;
  };
  const login = useCallback(async (email, password) => start(await apiLogin(email, password)), []);
  const register = useCallback(async (data) => start(await apiRegister(data)), []);
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
  }, []);

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
