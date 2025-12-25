import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/authContext";
import RealtimeContext from "./realtimeContext";

const defaultWsBase = 'ws://localhost:3003/api/realtime_hub';

const WS_BASE = import.meta.env.VITE_WS_BASE || defaultWsBase;

export const RealtimeProvider = ({ children }) => {
  const { token, user } = useAuth();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineMap, setOnlineMap] = useState(() => ({}));
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const onlineUsersUpdateRef = useRef(null);

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

    const connect = () => {
      // avoid creating multiple concurrent sockets
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        console.debug("realtime: existing socket state", wsRef.current.readyState);
        return;
      }

      // Build ws url with token and user_id
      const url = `${WS_BASE}?token=${encodeURIComponent(token)}&user_id=${encodeURIComponent(user.id)}`;
      console.debug("realtime: connecting to", {
        base: WS_BASE,
        hasToken: !!token,
        userId: user?.id,
        tokenExpiry: token ? JSON.parse(atob(token.split('.')[1]))?.exp : null
      });

      try {
        const ws = new WebSocket(url);
        // keep a local reference to this socket so we can ignore events from older sockets
        const currentWs = ws;
        wsRef.current = currentWs;

        ws.onopen = () => {
          attemptsRef.current = 0;
          if (!mounted) return;
          setIsConnected(true);
          console.debug("realtime: socket open");
          // Notify that online users should be refreshed
          if (onlineUsersUpdateRef.current) {
            onlineUsersUpdateRef.current();
          }
          // Optionally notify server of presence (uncomment if backend expects client to send)
          try {
            // currentWs.send(JSON.stringify({ type: "user_status", user_id: user.id, online: true }));
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
            if (data && data.type === "online_users_list" && Array.isArray(data.user_ids)) {
              const ids = new Set(data.user_ids.map(id => String(id)));
              console.log("realtime: received online users list", Array.from(ids));
              setOnlineUserIds(ids);
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
              currentWs.close();
            } catch (e) {
              console.warn(e);
            }
          }
          
          // Try to decode token to check expiry
          let tokenInfo = {};
          try {
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const expiresIn = (payload.exp * 1000) - Date.now();
              tokenInfo = {
                tokenExpiry: new Date(payload.exp * 1000).toISOString(),
                expiresInMs: expiresIn,
                isExpired: expiresIn < 0
              };
            }
          } catch (e) {
           console.log(e)
          }

          console.error("realtime: socket error - Backend server may not be running", {
            message: err.message || "Unknown error",
            type: err.type,
            readyState: currentWs.readyState,
            wsBase: WS_BASE,
            serverUrl: WS_BASE,
            timestamp: new Date().toISOString(),
            tokenInfo,
            suggestion: "Ensure backend is running on " + WS_BASE
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
    };
  }, [token, user]);

  const value = {
    isConnected,
    onlineMap,
    onlineUserIds,
    getOnline: (userId) => !!onlineMap[userId],
    setOnlineUsersRefreshCallback: (callback) => {
      onlineUsersUpdateRef.current = callback;
    },
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export default RealtimeProvider;
