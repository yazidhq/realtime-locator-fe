import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Wifi, WifiOff } from "lucide-react";
import { useRealtime } from "../../context/realtime/realtimeContext";
import { useUser } from "../../context/user/userContext";
import userService from "../../services/userService";

const AdminDashboard = () => {
  const { handleGetAll } = useUser();
  const { onlineMap, setOnlineUsersRefreshCallback } = useRealtime();

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [apiOnlineUserIds, setApiOnlineUserIds] = useState(() => new Set());

  useEffect(() => {
    let mounted = true;

    const refreshOnlineList = async () => {
      try {
        const res = await userService.getOnlineList();
        const ids = Array.isArray(res?.online_users) ? res.online_users : [];
        if (!mounted) return;
        setApiOnlineUserIds(new Set(ids.map((x) => String(x)).filter(Boolean)));
      } catch {
        // ignore (websocket will still update onlineMap if server pushes)
      }
    };

    setOnlineUsersRefreshCallback(refreshOnlineList);
    refreshOnlineList();

    return () => {
      mounted = false;
    };
  }, [setOnlineUsersRefreshCallback]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit: 0, ["filter[role]"]: "member", ["op[role]"]: "=" };
        const res = await handleGetAll(params);
        if (!res?.ok) throw new Error(res?.error || "Failed to load sellers");
        if (!mounted) return;
        setSellers(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [handleGetAll]);

  const getSellerId = useCallback((seller) => {
    return String(seller?.id || seller?.user_id || seller?.userId || seller?.uuid || "");
  }, []);

  const isOnlineById = useCallback(
    (id) => {
      const uid = String(id || "");
      if (!uid) return false;
      if (onlineMap && Object.prototype.hasOwnProperty.call(onlineMap, uid)) return !!onlineMap[uid];
      return apiOnlineUserIds.has(uid);
    },
    [onlineMap, apiOnlineUserIds]
  );

  const stats = useMemo(() => {
    const total = sellers.length;
    const online = sellers.reduce((acc, s) => {
      const id = getSellerId(s);
      return acc + (isOnlineById(id) ? 1 : 0);
    }, 0);
    const offline = Math.max(0, total - online);
    return { total, online, offline };
  }, [sellers, getSellerId, isOnlineById]);

  return (
    <div className="container-fluid p-0">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-1 fw-bold">Dashboard</h4>
          <div className="text-muted">Overview of seller status (real-time)</div>
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-4">Loading sellers…</div>
      ) : error ? (
        <div className="admin-card p-4 text-danger">{error}</div>
      ) : (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="admin-kpi">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="admin-kpi-label">Total sellers</div>
                  <div className="admin-kpi-value">{stats.total}</div>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 46, height: 46, background: "#eef2ff" }}>
                  <Users size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="admin-kpi">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="admin-kpi-label">Online sellers</div>
                  <div className="admin-kpi-value">{stats.online}</div>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 46, height: 46, background: "#eafff1" }}>
                  <Wifi size={20} color="#16a34a" />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="admin-kpi">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="admin-kpi-label">Offline sellers</div>
                  <div className="admin-kpi-value">{stats.offline}</div>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 46, height: 46, background: "#f1f5f9" }}>
                  <WifiOff size={20} color="#64748b" />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="admin-card p-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="fw-semibold">Live status</div>
              </div>

              <div className="mt-3" style={{ maxHeight: 360, overflowY: "auto", overflowX: "hidden" }}>
                {sellers.length === 0 ? (
                  <div className="text-muted">No sellers found.</div>
                ) : (
                  <div className="row g-2">
                    {sellers.map((s) => {
                      const id = getSellerId(s);
                      const name = s?.username || s?.name || id;
                      const online = isOnlineById(id);
                      return (
                        <div className="col-12 col-lg-6" key={id || name}>
                          <div className="d-flex align-items-center justify-content-between border rounded-3 p-3 bg-white">
                            <div className="d-flex align-items-center gap-2">
                              <span className={`status-dot ${online ? "online" : "offline"}`} />
                              <div>
                                <div className="fw-bold">{name}</div>
                                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                                  {online ? "Online" : "Offline"}
                                </div>
                              </div>
                            </div>
                            <div>
                                <div className="fw-medium" style={{ fontSize: "0.85rem" }}>{s?.email}</div>
                                <div className="text-muted" style={{ fontSize: "0.85rem" }}>{s?.phone_number}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
