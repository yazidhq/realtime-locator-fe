import { useState, useCallback } from "react";
import { AuthContext } from "./authContext";
import authService from "../../services/authService";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("authToken") || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("authRefreshToken") || null);
  const isAuthenticated = !!token;

  const handleRegister = async (payload) => {
    try {
      const res = await authService.register(payload);
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const res = await authService.login({ email: credentials.email, password: credentials.password });
      const data = res || {};
      const t = data.access_token || null;
      const rt = data.refresh_token || null;
      const id = data.id || null;
      const name = data.name || null;
      const email = data.email || null;
      const phone_number = data.phone_number || null;

      if (!t) throw new Error("token not provided by server");

      setToken(t);
      setRefreshToken(rt);
      const userObj = { id, name, email, phone_number };
      setUser(userObj);
      localStorage.setItem("authToken", t);
      if (rt) localStorage.setItem("authRefreshToken", rt);
      localStorage.setItem("authUser", JSON.stringify(userObj));

      return { ok: true, user: userObj };
    } catch (error) {
      return { ok: false, error: String(error.message || error) };
    }
  };

  const handleLogout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setRefreshToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authRefreshToken");
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (!refreshToken) throw new Error("no refresh token");
      const res = await authService.refreshToken(refreshToken);
      const data = res || {};
      const t = data.access_token || null;
      const rt = data.refresh_token || null;
      if (!t) throw new Error("refresh failed: no token");
      setToken(t);
      if (rt) setRefreshToken(rt);
      localStorage.setItem("authToken", t);
      if (rt) localStorage.setItem("authRefreshToken", rt);
      return { ok: true };
    } catch (err) {
      await handleLogout();
      return { ok: false, error: String(err.message || err) };
    }
  }, [refreshToken, handleLogout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        handleRegister,
        handleLogin,
        handleLogout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
