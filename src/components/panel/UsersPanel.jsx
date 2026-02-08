import { CircleUser, Eye } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/auth/authContext";
import { useUser } from "../../context/user/userContext";
import UserDetailPanel from "./UserDetailPanel";
import { useRealtime } from "../../context/realtime/realtimeContext";
import userService from "../../services/userService";

const UsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user: currentUser } = useAuth();
  const { handleGetAll } = useUser();
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const { setOnlineUsersRefreshCallback, onlineMap } = useRealtime();
  // baseline from REST endpoint; realtime (onlineMap) will override per-user when present
  const [apiOnlineUserIds, setApiOnlineUserIds] = useState(new Set());
  const refreshCallbackRef = useRef(null);

  // Helper function to refresh online list`
  const refreshOnlineList = async () => {
    try {
      const res = await userService.getOnlineList();
      if (res) {
        const onlineUsers = Array.isArray(res?.online_users) ? res.online_users : [];
        const userIds = onlineUsers.map((id) => String(id)).filter(Boolean);
        setApiOnlineUserIds(new Set(userIds));
      }
    } catch (err) {
      console.error("realtime: refresh error", err);
    }
  };

  // Register callback with RealtimeProvider so it can trigger refresh on WebSocket open
  useEffect(() => {
    refreshCallbackRef.current = refreshOnlineList;
    setOnlineUsersRefreshCallback(refreshOnlineList);
  }, [setOnlineUsersRefreshCallback]);

  // Fetch initial list of all members and get online list
  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit: 0, ["filter[role]"]: "member", ["op[role]"]: "=" };
        const res = await handleGetAll(params);
        if (!res.ok) throw new Error(res.error || "Failed to fetch users");
        
        if (mounted) {
          setUsers(res.data ?? []);
        }
        
        // Fetch online users list
        if (mounted && refreshCallbackRef.current) {
          await refreshCallbackRef.current();
        }
      } catch (err) {
        console.error("realtime: fetch error", err);
        if (mounted) setError(err.message || "Failed to load users");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      mounted = false;
    };
  }, [handleGetAll]);

  const isOnline = (u) => {
    const userId = String(u?.id || u?.user_id || u?.userId || u?.uuid || "");
    if (!userId) return false;
    // if realtime has an explicit value for this user, prefer it
    if (onlineMap && Object.prototype.hasOwnProperty.call(onlineMap, userId)) {
      return !!onlineMap[userId];
    }
    return apiOnlineUserIds.has(userId);
  };

  const getStatusColor = (u) => {
    return isOnline(u) ? "bg-success" : "bg-secondary";
  };

  // Sort users: online first, then offline
  const filteredUsers = users.filter((u) => {
    const id = String(u?.id || u?.user_id || u?.userId || u?.uuid || "");
    const currentId = String(currentUser?.id || "");
    return !(id && currentId && id === currentId);
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aId = String(a?.id || a?.user_id || a?.userId || a?.uuid || "");
    const bId = String(b?.id || b?.user_id || b?.userId || b?.uuid || "");
    const aOnline = aId ? isOnline(a) : false;
    const bOnline = bId ? isOnline(b) : false;
    return bOnline - aOnline; // true (1) comes before false (0)
  });

  const visibleUsers = showOffline ? sortedUsers : sortedUsers.filter((u) => isOnline(u));

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold">Users</h5>
        <button
          type="button"
          className="btn btn-light rounded-pill shadow-sm px-3"
          onClick={() => setShowOffline((v) => !v)}
        >
          {showOffline ? "Hide Offline" : "Show Offline"}
        </button>
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="text-center py-3 text-muted">Loading users...</div>
        ) : error ? (
          <div className="text-center py-3 text-danger">{error}</div>
        ) : visibleUsers.length === 0 ? (
          <div className="text-center py-3 text-muted">No users found</div>
        ) : (
          visibleUsers.map((u) => (
            <div
              key={u.id}
              className="d-flex align-items-center justify-content-between p-3 bg-white rounded-4 mb-3 user-card border"
              role="button"
              onClick={() => {
                setSelectedUser(u);
                setDetailOpen(true);
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="position-relative">
                  <div className="avatar-bg rounded-circle d-flex align-items-center justify-content-center">
                    <CircleUser size={28} />
                  </div>
                  <span
                    className={`position-absolute bottom-0 end-0 rounded-circle border border-white ${getStatusColor(u)}`}
                    style={{ width: "12px", height: "12px" }}
                  ></span>
                </div>

                <div>
                  <span className="fw-bold text-dark">{u.username}</span>
                  <p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>
                    {isOnline(u) ? "Online" : "Offline"}
                    {u.location ? ` · ${u.location}` : null}
                    {u.lastActive ? ` · ${u.lastActive}` : null}
                  </p>
                </div>
              </div>

              <button className="btn btn-light rounded-pill shadow-sm px-3 d-flex align-items-center gap-1" type="button">
                <Eye size={16} />
                <span className="d-none d-md-inline">Detail</span>
              </button>
            </div>
          ))
        )}
      </div>

      {detailOpen && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => {
            setDetailOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      <style>{`
        .avatar-bg {
          width: 48px;
          height: 48px;
          background:#eef2ff;
          transition: 0.3s;
        }
        .user-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.06) !important;
        }
        .user-card:hover .avatar-bg {
          background:#dbe4ff;
        }
      `}</style>
    </>
  );
};

export default UsersPanel;
