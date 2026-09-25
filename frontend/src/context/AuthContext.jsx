import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

// Auto-logout after this many milliseconds of no mouse/keyboard/touch activity.
// Sensitive HR data (salaries, personal details, performance reviews) can sit
// on screen — an unattended, still-logged-in tab is a real exposure risk.
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  // Idle auto-logout: only armed while someone is actually logged in.
  useEffect(() => {
    if (!user) {
      clearTimeout(idleTimerRef.current);
      return;
    }

    function resetTimer() {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        sessionStorage.setItem("logoutReason", "idle");
        logout();
      }, IDLE_TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    // Also catch activity happening in a different browser tab of the same app.
    document.addEventListener("visibilitychange", resetTimer);

    return () => {
      clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      document.removeEventListener("visibilitychange", resetTimer);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
