import { createContext, useContext, useState, useCallback } from 'react';
import { useDb } from '../lib/useDb';
import { SESSION_KEY } from '../lib/db';
import { login as apiLogin, register as apiRegister, logout as apiLogout, verifySignupOtp } from '../api/auth';

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
  const [, setSessionId] = useState(readSession);
  // Сешн дууссан (Supabase) эсвэл түдгэлзсэн хэрэглэгч автоматаар гарна
  const sessionId = readSession();
  const user = sessionId ? db.users.find((u) => u.id === sessionId && u.status === 'active') || null : null;

  const start = (u) => {
    localStorage.setItem(SESSION_KEY, String(u.id));
    setSessionId(u.id);
    return u;
  };
  const login = useCallback(async (email, password) => start(await apiLogin(email, password)), []);
  const register = useCallback(async (data) => {
    try {
      return start(await apiRegister(data));
    } finally {
      setSessionId(readSession()); // бүртгэл үүсээд дараагийн алхам амжилтгүй болсон ч нэвтэрсэн хэвээр
    }
  }, []);
  const confirmOtp = useCallback(async (email, token, pending) => {
    try {
      return start(await verifySignupOtp(email, token, pending));
    } finally {
      setSessionId(readSession());
    }
  }, []);
  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    await apiLogout().catch(() => {});
  }, []);

  return <AuthCtx.Provider value={{ user, login, register, confirmOtp, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
