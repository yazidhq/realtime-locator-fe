import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { useUser } from "../../context/user/userContext";
import { useRealtime } from "../../context/realtime/realtimeContext";
import userService from "../../services/userService";
import { useLocation } from "../../context/location/locationContext";
import themes from "../../assets/map-themes";

const parseDDMMYYYY = (s) => {
  const m = /^([0-3]\d)-([0-1]\d)-(\d{4})$/.exec(String(s || "").trim());
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  return new Date(yyyy, mm - 1, dd);
};

const formatDateId = (dateStr) => {
  const d = parseDDMMYYYY(dateStr);
  if (!d) return String(dateStr || "-");
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
};

const getUserId = (u) => String(u?.id || u?.user_id || u?.userId || u?.uuid || "");

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!Array.isArray(points) || points.length === 0) return;

    const latLngs = points.map((p) => [p.latitude, p.longitude]);

    const run = () => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }

      try {
        const bounds = L?.latLngBounds ? L.latLngBounds(latLngs) : null;
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24], maxZoom: 19 });
        } else {
          map.setView(latLngs[0], Math.max(map.getZoom?.() ?? 16, 16));
        }
      } catch {
        map.setView(latLngs[0], Math.max(map.getZoom?.() ?? 16, 16));
      }
    };

    const t1 = window.setTimeout(run, 0);
    const t2 = window.setTimeout(run, 200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map, points]);

  return null;
};

const AdminUsersHistory = () => {
  const { handleGetAll } = useUser();
  const { onlineMap, setOnlineUsersRefreshCallback } = useRealtime();
    // Track online user IDs from REST (same as dashboard)
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
          // ignore
        }
      };
      setOnlineUsersRefreshCallback(refreshOnlineList);
      refreshOnlineList();
      return () => { mounted = false; };
    }, [setOnlineUsersRefreshCallback]);
  const { handleGetHistoryByUserId } = useLocation() || {};

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [activeDay, setActiveDay] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      setLoadingUsers(true);
      setUsersError(null);
      try {
        const params = { limit: 0, ["filter[role]"]: "member", ["op[role]"]: "=" };
        const res = await handleGetAll(params);
        if (!res?.ok) throw new Error(res?.error || "Failed to load users");
        if (!mounted) return;

        const rows = Array.isArray(res.data) ? res.data : [];
        setUsers(rows);
        if (rows.length > 0) {
          setSelectedUser(rows[0]);
        }
      } catch (e) {
        if (mounted) {
          setUsersError(e?.message || String(e));
          setUsers([]);
        }
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    };

    loadUsers();
    return () => {
      mounted = false;
    };
  }, [handleGetAll]);

  useEffect(() => {
    if (!selectedUser) {
      setHistory([]);
      return;
    }
    if (typeof handleGetHistoryByUserId !== "function") {
      setHistoryError("History API not available");
      return;
    }

    let mounted = true;

    const loadHistory = async () => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const uid = getUserId(selectedUser);
        if (!uid) throw new Error("Invalid user id");

        const res = await handleGetHistoryByUserId(uid);
        if (!res?.ok) throw new Error(res?.error || "Failed to load history");

        if (!mounted) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setHistory(rows);
      } catch (e) {
        if (mounted) {
          setHistoryError(e?.message || String(e));
          setHistory([]);
        }
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [selectedUser, handleGetHistoryByUserId]);

  const renderedHistory = useMemo(() => {
    const groups = Array.isArray(history) ? history : [];

    const normalized = groups
      .map((g, idx) => {
        const date = String(g?.date || "").trim();
        const locations = Array.isArray(g?.locations) ? g.locations : [];
        const key = date || String(idx);
        return { key, date, locations };
      })
      .filter((g) => g.date);

    return normalized.sort((a, b) => {
      const da = parseDDMMYYYY(a.date);
      const db = parseDDMMYYYY(b.date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
  }, [history]);

  const activeLocations = useMemo(() => {
    const locs = Array.isArray(activeDay?.locations) ? activeDay.locations : [];
    return locs
      .map((l, idx) => {
        const id = String(l?.id || "");
        const latitude = Number(l?.latitude ?? l?.lat);
        const longitude = Number(l?.longitude ?? l?.lng);
        const createdAt = l?.created_at ?? l?.createdAt;
        return { key: id || `${idx}`, latitude, longitude, createdAt };
      })
      .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude));
  }, [activeDay]);

  const openDayModal = (day) => {
    setActiveDay(day);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveDay(null);
  };

  const tileUrl = useMemo(() => {
    return themes.find((t) => t.id === "streets")?.url || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }, []);

  const selectedId = getUserId(selectedUser);
  const selectedName = selectedUser?.username || selectedUser?.name || selectedId;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-1 fw-bold">Users History</h4>
          <div className="text-muted">Pick a user and view their historical locations by day</div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="admin-card p-3" style={{ height: "calc(100vh - 190px)", overflow: "auto" }}>
            {loadingUsers ? (
              <div className="text-muted">Loading users…</div>
            ) : usersError ? (
              <div className="text-danger">{usersError}</div>
            ) : users.length === 0 ? (
              <div className="text-muted">No users found.</div>
            ) : (
              <div className="d-grid gap-2">
                {users.map((u) => {
                  const id = getUserId(u);
                  const name = u?.username || u?.name || id;
                  const active = id && selectedId && id === selectedId;
                  // Online status: use same logic as dashboard
                  const uid = getUserId(u);
                  let isOnline = false;
                  if (uid) {
                    if (onlineMap && Object.prototype.hasOwnProperty.call(onlineMap, uid)) isOnline = !!onlineMap[uid];
                    else isOnline = apiOnlineUserIds.has(uid);
                  }

                  return (
                    <button
                      key={id || name}
                      type="button"
                      className={`btn text-start ${active ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="fw-semibold">{name}</div>
                      <div style={{ fontSize: "0.85rem", opacity: active ? 0.9 : 0.75 }}>
                        <span
                          className="status-dot"
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            marginRight: 6,
                            background: isOnline ? "#22c55e" : "#94a3b8",
                            verticalAlign: "middle",
                          }}
                        />
                        {isOnline ? "Online" : "Offline"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="admin-card p-3" style={{ height: "calc(100vh - 190px)", overflow: "auto" }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <div className="fw-semibold">History</div>
                <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                  {selectedUser ? `User: ${selectedName}` : "Select a user"}
                </div>
              </div>
            </div>

            <hr />

            {loadingHistory ? (
              <div className="text-muted">Loading history…</div>
            ) : historyError ? (
              <div className="text-danger">{historyError}</div>
            ) : !selectedUser ? (
              <div className="text-muted">Select a user to see history.</div>
            ) : renderedHistory.length === 0 ? (
              <div className="text-muted">No history for this user.</div>
            ) : (
              <div className="d-grid gap-2">
                {renderedHistory.map((day) => (
                  <div key={day.key} className="border rounded-3 p-3 bg-white d-flex align-items-center justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold">{formatDateId(day.date)}</div>
                      <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                        {Array.isArray(day.locations) ? day.locations.length : 0} points
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline-primary" onClick={() => openDayModal(day)}>
                      View map
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title mb-0">{activeDay?.date ? formatDateId(activeDay.date) : "-"}</h5>
                    <div className="text-muted" style={{ fontSize: "0.9rem" }}>{selectedName}</div>
                  </div>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                </div>
                <div className="modal-body">
                  {activeLocations.length === 0 ? (
                    <div className="text-muted">No locations for this date.</div>
                  ) : (
                    <div style={{ height: "60vh", width: "100%" }}>
                      <MapContainer
                        key={`${selectedId}-${activeDay?.date || "history"}`}
                        center={[activeLocations[0].latitude, activeLocations[0].longitude]}
                        zoom={16}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={true}
                      >
                        <TileLayer url={tileUrl} />
                        <FitBounds points={activeLocations} />

                        <Polyline
                          positions={activeLocations.map((p) => [p.latitude, p.longitude])}
                          pathOptions={{ color: "#1e3a5f", weight: 4, opacity: 0.75 }}
                        />

                        {activeLocations.map((p) => (
                          <CircleMarker
                            key={p.key}
                            center={[p.latitude, p.longitude]}
                            radius={5}
                            pathOptions={{ color: "#fff", weight: 2, fillColor: "#dc3545", fillOpacity: 0.9 }}
                          />
                        ))}
                      </MapContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeModal} />
        </>
      )}
    </div>
  );
};

export default AdminUsersHistory;
