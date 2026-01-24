import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import themes from "../../assets/map-themes";
import AdminUsersMarkers from "../../components/map/AdminUsersMarkers";
import { useRealtime } from "../../context/realtime/realtimeContext";
import { useLocation } from "../../context/location/locationContext";
import userService from "../../services/userService";
import { useUser } from "../../context/user/userContext";

const formatTime = (ts) => {
  const t = Number(ts || 0);
  if (!t) return "-";
  try {
    return new Date(t).toLocaleString();
  } catch {
    return String(t);
  }
};

const AdminMapMonitoring = () => {
  const {
    locationsByUserId,
    onlineMap,
    onlineUserIds,
    applyOnlineUsersList,
    setOnlineUsersRefreshCallback,
    sendMessageToUser,
    messageStatusById,
    upsertLocationsSnapshot,
    getOnline,
  } = useRealtime();
  const { handleGetAll } = useLocation() || {};
  const [selected, setSelected] = useState(null); // { userId, name, email, phone }
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const { handleGetById } = useUser();
  const [messageText, setMessageText] = useState("");
  const [lastSentId, setLastSentId] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState(null);
  const [onlineError, setOnlineError] = useState(null);

  const tileUrl = useMemo(() => {
    return themes.find((t) => t.id === "streets")?.url || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }, []);

  // Ensure we know who is online (REST fallback). Without this, the map may filter out everyone.
  useEffect(() => {
    let mounted = true;

    const refreshOnlineList = async () => {
      try {
        setOnlineError(null);
        const res = await userService.getOnlineList();
        if (!mounted) return;

        const ids =
          (Array.isArray(res?.online_users) && res.online_users) ||
          (Array.isArray(res?.data?.online_users) && res.data.online_users) ||
          (Array.isArray(res?.user_ids) && res.user_ids) ||
          (Array.isArray(res?.data?.user_ids) && res.data.user_ids) ||
          [];

        applyOnlineUsersList(ids);
      } catch (e) {
        if (mounted) setOnlineError(e?.message || String(e));
      }
    };

    // Allow WS provider to trigger refresh on connect.
    if (typeof setOnlineUsersRefreshCallback === "function") {
      setOnlineUsersRefreshCallback(refreshOnlineList);
    }

    refreshOnlineList();
    return () => {
      mounted = false;
    };
  }, [applyOnlineUsersList, setOnlineUsersRefreshCallback]);

  // On first load, fetch latest known locations via REST so admin sees markers immediately.
  // Realtime WS updates will continue to update positions afterwards.
  useEffect(() => {
    if (typeof handleGetAll !== "function") return;

    let mounted = true;

    const parseTs = (row) => {
      const v = row?.updated_at ?? row?.updatedAt ?? row?.created_at ?? row?.createdAt ?? row?.ts ?? row?.timestamp;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : 0;
      }
      return 0;
    };

    const getUid = (row) => {
      return String(row?.user_id || row?.userId || row?.user?.id || row?.user?.user_id || row?.uuid || "");
    };

    const loadSnapshot = async () => {
      setLoadingSnapshot(true);
      setSnapshotError(null);
      try {
        // Best-effort: fetch all locations and keep the latest point per user.
        // If your backend supports sorting/limit, we can optimize later.
        const res = await handleGetAll({ limit: 0 });
        if (!mounted) return;
        if (!res?.ok) throw new Error(res?.error || "Failed to load locations snapshot");

        const rows = Array.isArray(res?.data) ? res.data : [];
        const snapshot = {};

        for (const row of rows) {
          const uid = getUid(row);
          if (!uid) continue;
          const lat = Number(row?.latitude ?? row?.lat);
          const lng = Number(row?.longitude ?? row?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const ts = parseTs(row) || 0;
          const prevTs = Number(snapshot?.[uid]?.updatedAt ?? 0);
          if (!prevTs || (ts && ts >= prevTs)) {
            snapshot[uid] = {
              latitude: lat,
              longitude: lng,
              updatedAt: ts || Date.now(),
            };
          }
        }

        upsertLocationsSnapshot(snapshot);
      } catch (e) {
        if (mounted) setSnapshotError(e?.message || String(e));
      } finally {
        if (mounted) setLoadingSnapshot(false);
      }
    };

    loadSnapshot();
    return () => {
      mounted = false;
    };
  }, [handleGetAll, upsertLocationsSnapshot]);

  const selectedId = String(selected?.userId || "");
  const selectedLoc = selectedId ? locationsByUserId?.[selectedId] : null;
  const selectedOnline = selectedId ? !!getOnline?.(selectedId) : null;
  const lastStatus = lastSentId ? messageStatusById?.[lastSentId] : null;

  const submitMessage = (e) => {
    e.preventDefault();
    if (!selectedId) return;
    const res = sendMessageToUser({ toUserId: selectedId, text: messageText });
    if (res?.ok) {
      setLastSentId(res.messageId);
      setMessageText("");
    }
  };

  // Fetch user detail (email, phone) when a marker is selected
  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      setSelectedUserDetail(null);
      if (!selected?.userId) return;
      try {
        const res = await handleGetById(selected.userId);
        if (!mounted) return;
        if (res?.ok && res.data) setSelectedUserDetail(res.data);
      } catch { /* ignore */ }
    };
    fetchDetail();
    return () => { mounted = false; };
  }, [selected?.userId, handleGetById]);

  return (
    <div className="container-fluid p-0">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-1 fw-bold">Map Monitoring</h4>
          <div className="text-muted">Real-time seller tracking</div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="admin-card p-3" style={{ height: "calc(100vh - 190px)" }}>
            {(loadingSnapshot || snapshotError) && (
              <div className="px-2 pt-2">
                {loadingSnapshot && <div className="text-muted" style={{ fontSize: "0.9rem" }}>Loading latest locations…</div>}
                {!loadingSnapshot && snapshotError && (
                  <div className="text-danger" style={{ fontSize: "0.9rem" }}>
                    {snapshotError}
                  </div>
                )}
              </div>
            )}
              {onlineError && (
                <div className="px-2 pt-1 text-danger" style={{ fontSize: "0.9rem" }}>
                  Failed to load online users: {onlineError}
                </div>
              )}
              {!onlineError && (!onlineMap || Object.keys(onlineMap).length === 0) && (!onlineUserIds || onlineUserIds.size === 0) && (
                <div className="px-2 pt-1 text-muted" style={{ fontSize: "0.9rem" }}>
                  Waiting for online users…
                </div>
              )}
            <MapContainer
              center={[-6.2383, 106.9756]}
              zoom={12}
              style={{ height: "100%", width: "100%", borderRadius: 12 }}
              zoomControl={true}
            >
              <TileLayer url={tileUrl} />
              <AdminUsersMarkers
                selectedUserId={selectedId}
                onSelectUser={({ userId, name }) => setSelected({ userId, name })}
              />
            </MapContainer>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="admin-card p-3" style={{ height: "calc(100vh - 190px)", overflow: "auto" }}>
            <div className="fw-semibold">Seller Details</div>

            {!selectedId ? (
              <div className="text-muted mt-2">Click a seller marker to view details and send a message.</div>
            ) : (
              <>
                <div className="mt-3">
                  <div className="d-flex align-items-start justify-content-between gap-2 p">
                    <div>
                      <div className="fw-semibold">{selected?.name || selectedId}</div>
                      {selectedUserDetail?.email && (
                        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                          <span>Email: {selectedUserDetail.email}</span>
                        </div>
                      )}
                      {selectedUserDetail?.phone_number && (
                        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                          <span>Phone: {selectedUserDetail.phone_number}</span>
                        </div>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`status-dot ${selectedOnline === true ? "online" : "offline"}`} />
                      <span className="text-muted" style={{ fontSize: "0.9rem" }}>
                        {selectedOnline === true ? "Online" : selectedOnline === false ? "Offline" : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border rounded-3 p-3 bg-white">
                    <div className="text-muted" style={{ fontSize: "0.9rem" }}>Last location</div>
                    {selectedLoc ? (
                      <>
                        <div className="fw-semibold">{Number(selectedLoc?.latitude).toFixed(6)}, {Number(selectedLoc?.longitude).toFixed(6)}</div>
                        <hr />
                        <div className="text-muted" style={{ fontSize: "0.9rem" }}>Updated: {formatTime(selectedLoc?.updatedAt)}</div>
                      </>
                    ) : (
                      <div className="text-muted">No location yet.</div>
                    )}
                  </div>
                </div>

                <hr />

                <div>
                  <div className="fw-semibold mb-2">Send message</div>
                  <form onSubmit={submitMessage}>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type message..."
                    />

                    {lastStatus?.status && (
                      <div className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>
                        Delivery: <span className="fw-semibold">{String(lastStatus.status)}</span>
                      </div>
                    )}

                    <div className="d-flex justify-content-end mt-3">
                      <button type="submit" className="btn btn-primary" disabled={!messageText.trim()}>
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapMonitoring;
