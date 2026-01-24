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
      const data = await authService.register(payload);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleLogin = async ({ email, password }) => {
    try {
      const data = await authService.login({ email, password });

      const access = data.access_token;
      if (!access) throw new Error("Token not provided by server");

      const rawId =
        data?.id ??
        data?.user_id ??
        data?.userId ??
        data?.uuid ??
        data?.user?.id ??
        data?.user?.user_id ??
        data?.user?.userId ??
        data?.user?.uuid ??
        null;

      const userObj = {
        id: rawId != null ? String(rawId) : null,
        name: data?.name ?? data?.user?.name ?? null,
        email: data?.email ?? data?.user?.email ?? null,
        username: data?.username ?? data?.user?.username ?? null,
        phone_number: data?.phone_number ?? data?.user?.phone_number ?? null,
      };

      setToken(access);
      setRefreshToken(data.refresh_token || null);
      setUser(userObj);

      localStorage.setItem("authToken", access);
      if (data.refresh_token) localStorage.setItem("authRefreshToken", data.refresh_token);
      localStorage.setItem("authUser", JSON.stringify(userObj));

      return { ok: true, user: userObj };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  const handleLogout = useCallback(async () => {
    // Call backend logout first so it can ForceOffline using userID from token context.
    // Even if it fails (network, server down), still clear local auth state.
    try {
      await authService.logout();
    } catch (err) {
      // ignore and proceed with local logout
      console.warn("logout api failed", err);
    } finally {
      setToken(null);
      setUser(null);
      setRefreshToken(null);

      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      localStorage.removeItem("authRefreshToken");
    }

    return { ok: true };
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) return { ok: false, error: "no refresh token" };

    try {
      const data = await authService.refreshToken(refreshToken);

      const newAccess = data.access_token;
      if (!newAccess) throw new Error("Refresh failed: no token received");

      setToken(newAccess);
      localStorage.setItem("authToken", newAccess);

      if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
        localStorage.setItem("authRefreshToken", data.refresh_token);
      }

      return { ok: true };
    } catch (err) {
      handleLogout();
      return { ok: false, error: err.message || String(err) };
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
