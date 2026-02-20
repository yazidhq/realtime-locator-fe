import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/authContext";
import RealtimeContext from "./realtimeContext";

const defaultWsBase = 'ws://localhost:3003/api/realtime_hub';

const WS_BASE = import.meta.env.VITE_WS_BASE || defaultWsBase;

const normalizeWsBase = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";

  // Already ws(s)
  if (/^wss?:\/\//i.test(s)) {
    // Avoid mixed content when the page is HTTPS
    if (globalThis.location?.protocol === "https:" && /^ws:\/\//i.test(s)) {
      return s.replace(/^ws:\/\//i, "wss://");
    }
    return s;
  }

  // Convert http(s) -> ws(s)
  if (/^https?:\/\//i.test(s)) {
    return s.replace(/^http/i, "ws");
  }

  // Relative path -> use current origin
  const origin = globalThis.location?.origin || "";
  if (!origin) return s;

  const u = new URL(s.startsWith("/") ? s : `/${s}`, origin);
  return u.toString().replace(/^http/i, "ws");
};

const safeDecodeJwtPayload = (jwt) => {
  try {
    const token = String(jwt || "");
    const parts = token.split(".");
    const payloadPart = parts[1];
    if (!payloadPart) return null;

    // JWT uses base64url; atob expects base64.
    let b64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (b64.length % 4)) % 4;
    if (padLen) b64 = b64.padEnd(b64.length + padLen, "=");

    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
};

export const RealtimeProvider = ({ children }) => {
  const { token, user } = useAuth();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  const errorStreakRef = useRef(0);
  const toastTimersRef = useRef(new Map());

  const [isConnected, setIsConnected] = useState(false);
  const [onlineMap, setOnlineMap] = useState(() => ({}));
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [locationsByUserId, setLocationsByUserId] = useState(() => ({}));
  const [messageStatusById, setMessageStatusById] = useState(() => ({}));
  const [toasts, setToasts] = useState(() => []);
  const onlineUsersUpdateRef = useRef(null);

  const makeClientMsgId = () => {
    try {
      if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    } catch {
      // ignore
    }
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const removeToast = useCallback((id) => {
    const key = String(id || "");
    if (!key) return;

    const t = toastTimersRef.current.get(key);
    if (t) {
      clearTimeout(t);
      toastTimersRef.current.delete(key);
    }

    setToasts((prev) => prev.filter((x) => String(x?.id) !== key));
  }, []);

  const pushToast = useCallback(({ title, message, variant = "info", ttlMs = 6000, meta = null }) => {
    const id = makeClientMsgId();
    const toast = {
      id,
      title: String(title || "Notification"),
      message: String(message || ""),
      variant: String(variant || "info"),
      ts: Date.now(),
      meta,
    };

    setToasts((prev) => {
      const next = [toast, ...(Array.isArray(prev) ? prev : [])];
      // Avoid unbounded growth
      return next.slice(0, 5);
    });

    if (ttlMs && Number(ttlMs) > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, Number(ttlMs));
      toastTimersRef.current.set(id, timeoutId);
    }

    return id;
  }, [removeToast]);

  const applyOnlineUsersList = useCallback((userIds) => {
    const arr = Array.isArray(userIds)
      ? userIds
      : userIds && typeof userIds[Symbol.iterator] === "function"
        ? Array.from(userIds)
        : [];

    const ids = new Set(arr.map((id) => String(id)).filter(Boolean));
    setOnlineUserIds(ids);
    setOnlineMap(() => {
      const next = {};
      for (const id of ids) next[id] = true;
      return next;
    });
  }, []);

  const sendMyLocation = (payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    const msg = {
      type: "user_location",
      user_id: user?.id,
      latitude: payload?.latitude,
      longitude: payload?.longitude,
      ts: payload?.ts ?? Date.now(),
    };

    try {
      ws.send(JSON.stringify(msg));
      return true;
    } catch (e) {
      console.warn("realtime: sendMyLocation failed", e);
      return false;
    }
  };

  // Merge a snapshot of latest locations (e.g. from REST) into realtime state.
  // Does not overwrite newer ws updates.
  const upsertLocationsSnapshot = useCallback((snapshot) => {
    if (!snapshot || typeof snapshot !== "object") return;

    setLocationsByUserId((prev) => {
      const next = { ...(prev || {}) };
      for (const [uidRaw, loc] of Object.entries(snapshot)) {
        const uid = String(uidRaw || "");
        if (!uid) continue;

        const lat = Number(loc?.latitude);
        const lng = Number(loc?.longitude);
        const updatedAt = Number(loc?.updatedAt ?? loc?.ts ?? 0);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const prevUpdatedAt = Number(next?.[uid]?.updatedAt ?? 0);
        if (!prevUpdatedAt || (updatedAt && updatedAt >= prevUpdatedAt)) {
          next[uid] = {
            latitude: lat,
            longitude: lng,
            updatedAt: updatedAt || Date.now(),
          };
        }
      }
      return next;
    });
  }, []);

  const sendMessageToUser = ({ toUserId, text }) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return { ok: false, error: "socket_not_connected" };

    const to = String(toUserId || "").trim();
    const body = String(text || "").trim();
    if (!to) return { ok: false, error: "to_user_required" };
    if (!body) return { ok: false, error: "message_required" };

    // Backend contract (admin -> user):
    // { type: 'user_message', user_receiver_id: '<uuid>', message: '<text>' }
    // We still generate a local client id for UI delivery state.
    const msgId = makeClientMsgId();
    const msg = {
      type: "user_message",
      user_receiver_id: to,
      message: body,
    };

    try {
      ws.send(JSON.stringify(msg));
      setMessageStatusById((prev) => ({
        ...prev,
        [msgId]: { status: "sent", toUserId: to, updatedAt: Date.now() },
      }));
      return { ok: true, messageId: msgId };
    } catch (e) {
      console.warn("realtime: sendMessageToUser failed", e);
      setMessageStatusById((prev) => ({
        ...prev,
        [msgId]: { status: "failed", toUserId: to, updatedAt: Date.now() },
      }));
      return { ok: false, error: e?.message || String(e) };
    }
  };

  useEffect(() => {
    // If no token, ensure socket closed and state cleared
    if (!token || !user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setOnlineMap({});
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      attemptsRef.current = 0;
      return;
    }

    let mounted = true;
    const timers = toastTimersRef.current;

    const connect = () => {
      // avoid creating multiple concurrent sockets
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        console.debug("realtime: existing socket state", wsRef.current.readyState);
        return;
      }

      // Build ws url with token and user_id
      const base = normalizeWsBase(WS_BASE);
      const wsUrl = new URL(base);
      wsUrl.searchParams.set("token", token);
      wsUrl.searchParams.set("user_id", user.id);
      const url = wsUrl.toString();
      const tokenPayload = token ? safeDecodeJwtPayload(token) : null;
      console.debug("realtime: connecting to", {
        base,
        hasToken: !!token,
        userId: user?.id,
        tokenExpiry: tokenPayload?.exp ?? null,
      });

      try {
        const ws = new WebSocket(url);
        // keep a local reference to this socket so we can ignore events from older sockets
        const currentWs = ws;
        wsRef.current = currentWs;

        ws.onopen = () => {
          attemptsRef.current = 0;
          errorStreakRef.current = 0;
          if (!mounted) return;
          setIsConnected(true);
          console.debug("realtime: socket open");
          // Notify that online users should be refreshed
          if (onlineUsersUpdateRef.current) {
            onlineUsersUpdateRef.current();
          }
          // Optionally notify server of presence (uncomment if backend expects client to send)
          try {
            currentWs.send(JSON.stringify({ type: "user_status", user_id: user.id, online: true }));
          } catch (e) {
            console.warn("send presence failed", e);
          }
        };

        ws.onmessage = (ev) => {
          // ignore messages from stale sockets
          if (wsRef.current !== currentWs) return;
          try {
            const data = JSON.parse(ev.data);
            console.debug("realtime: message", data);

            // Incoming user messages (admin -> seller)
            // Backend: { type: 'user_message', user_receiver_id, message, ... }
            if (data && data.type === "user_message") {
              const receiver = String(data.user_receiver_id || data.userId || data.user_id || "");
              const currentId = String(user?.id || "");
              // If backend broadcasts to everyone, ensure only the receiver shows toast.
              if (!receiver || !currentId || receiver === currentId) {
                const msg = String(data.message || data.body || "").trim();
                if (msg) {
                  pushToast({
                    title: "New Message",
                    message: msg,
                    variant: "primary",
                    ttlMs: 8000,
                    meta: data,
                  });
                }
              }
            }
            
            // Handle user status updates
            if (data && data.type === "user_status" && data.user_id) {
              setOnlineMap((prev) => {
                const next = { ...prev, [data.user_id]: !!data.online };
                console.debug("realtime: onlineMap update", data.user_id, !!data.online, next);
                return next;
              });
              
              // Track in Set for UsersPanel
              setOnlineUserIds((prev) => {
                const next = new Set(prev);
                if (data.online) {
                  next.add(String(data.user_id));
                } else {
                  next.delete(String(data.user_id));
                }
                console.log("realtime: onlineUserIds updated", Array.from(next));
                return next;
              });
            }
            
            // Handle list of all online users (if server sends it on connect)
            // Backend sends: { type: 'online_users_list', users: ['uuid', ...] }
            if (data && data.type === "online_users_list" && Array.isArray(data.users)) {
              console.log("realtime: received online users list", data.users);
              applyOnlineUsersList(data.users);
            }

            // Handle location updates broadcasted by server
            // Backend protocol: type = 'user_location'
            // Keep compatibility with earlier 'location_update' name.
            if (data && (data.type === "user_location" || data.type === "location_update")) {
              const uid = String(data.user_id || "");
              const lat = Number(data.latitude ?? data.lat);
              const lng = Number(data.longitude ?? data.lng);
              if (uid && Number.isFinite(lat) && Number.isFinite(lng)) {
                setLocationsByUserId((prev) => {
                  const next = { ...prev };
                  next[uid] = {
                    latitude: lat,
                    longitude: lng,
                    updatedAt: Date.now(),
                  };
                  return next;
                });
              }
            }

            // Message delivery status (best-effort; depends on backend protocol)
            // Accept a few common shapes:
            // - { type: 'message_status', message_id, status }
            // - { type: 'admin_message_ack', message_id, status }
            // - { type: 'message_delivery', msg_id, status }
            if (data && typeof data === "object") {
              const t = String(data.type || "");
              const statusTypes = new Set(["message_status", "admin_message_ack", "message_delivery", "delivery_status"]);
              if (statusTypes.has(t)) {
                const id = String(data.message_id || data.msg_id || data.client_msg_id || data.id || "");
                const status = String(data.status || data.state || "").toLowerCase();
                if (id) {
                  setMessageStatusById((prev) => ({
                    ...prev,
                    [id]: {
                      ...(prev[id] || {}),
                      status: status || prev[id]?.status || "sent",
                      updatedAt: Date.now(),
                      raw: data,
                    },
                  }));
                }
              }
            }
          } catch (e) {
            console.warn(e);
          }
        };

        ws.onclose = (ev) => {
          // ignore close from stale sockets
          if (wsRef.current !== currentWs) return;
          if (!mounted) return;
          setIsConnected(false);
          console.debug("realtime: socket closed", ev && ev.code, ev && ev.reason);
          // attempt reconnect with backoff
          const attempt = attemptsRef.current + 1;
          attemptsRef.current = attempt;
          const delay = Math.min(30000, 1000 * Math.pow(1.5, attempt));
          console.warn(`realtime: reconnecting in ${delay}ms (attempt ${attempt})`);
          reconnectRef.current = setTimeout(() => {
            connect();
          }, delay);
        };

        ws.onerror = (err) => {
          // if this socket is current, close to trigger reconnect logic
          if (wsRef.current === currentWs) {
            try {
              if (currentWs.readyState !== WebSocket.CLOSING && currentWs.readyState !== WebSocket.CLOSED) {
                currentWs.close();
              }
            } catch (e) {
              console.warn(e);
            }
          }

          errorStreakRef.current = (errorStreakRef.current || 0) + 1;
          
          // Try to decode token to check expiry
          let tokenInfo = {};
          try {
            if (token) {
              const payload = safeDecodeJwtPayload(token);
              const exp = payload?.exp;
              const expiresIn = typeof exp === "number" ? (exp * 1000) - Date.now() : null;
              tokenInfo = {
                tokenExpiry: typeof exp === "number" ? new Date(exp * 1000).toISOString() : null,
                expiresInMs: expiresIn,
                isExpired: typeof expiresIn === "number" ? expiresIn < 0 : null,
              };
            }
          } catch (e) {
           console.log(e)
          }

          const streak = errorStreakRef.current;
          // Avoid noisy logs for transient failures; the client auto-retries.
          if (streak < 3) return;

          const baseMsg = "realtime: socket error";
          const suggestion =
            "WebSocket failed repeatedly. Backend may be down, auth may be rejected, or a proxy is blocking WS. Check backend logs for handshake errors.";

          console.error(baseMsg, {
            message: err.message || "Unknown error",
            type: err.type,
            readyState: currentWs.readyState,
            wsBase: WS_BASE,
            serverUrl: WS_BASE,
            timestamp: new Date().toISOString(),
            tokenInfo,
            errorStreak: streak,
            suggestion,
          });
        };
      } catch (err) {
        // schedule reconnect
        console.error("realtime: failed to create WebSocket", err);
        attemptsRef.current = attemptsRef.current + 1;
        const delay = Math.min(30000, 1000 * Math.pow(1.5, attemptsRef.current));
        console.warn(`realtime: retrying in ${delay}ms (attempt ${attemptsRef.current})`);
        reconnectRef.current = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.warn(e);
        }
      }

      try {
        for (const t of timers.values()) clearTimeout(t);
        timers.clear();
      } catch {
        // ignore
      }
    };
  }, [token, user, pushToast, applyOnlineUsersList]);

  const value = {
    isConnected,
    onlineMap,
    onlineUserIds,
    applyOnlineUsersList,
    locationsByUserId,
    upsertLocationsSnapshot,
    messageStatusById,
    toasts,
    sendMyLocation,
    sendMessageToUser,
    pushToast,
    removeToast,
    getOnline: (userId) => {
      const id = String(userId || "");
      if (!id) return false;
      if (Object.prototype.hasOwnProperty.call(onlineMap || {}, id)) return !!onlineMap[id];
      return !!onlineUserIds?.has?.(id);
    },
    setOnlineUsersRefreshCallback: (callback) => {
      onlineUsersUpdateRef.current = callback;
    },
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export default RealtimeProvider;
