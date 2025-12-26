import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth/authContext";
import { useRealtime } from "../../context/realtime/realtimeContext";
import { useLocation } from "../../context/location/locationContext";
import themes from "../../assets/map-themes";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const ProfilePanel = () => {
  const { user } = useAuth();
  const { isConnected, onlineMap } = useRealtime();
  const { handleGetHistoryByUserId } = useLocation() || {};

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(null);

  const userId = String(user?.id || "");
  const isOnline = userId
    ? (onlineMap && Object.prototype.hasOwnProperty.call(onlineMap, userId) ? !!onlineMap[userId] : isConnected)
    : isConnected;

  useEffect(() => {
    if (!userId) return;
    if (typeof handleGetHistoryByUserId !== "function") return;

    let mounted = true;
    const load = async () => {
      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const res = await handleGetHistoryByUserId(userId);
        if (!mounted) return;
        if (!res?.ok) throw new Error(res?.error || "Failed to load route history");

        const rows = Array.isArray(res?.data) ? res.data : [];
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

    load();
    return () => {
      mounted = false;
    };
  }, [userId, handleGetHistoryByUserId]);

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

    const parseDDMMYYYY = (s) => {
      const m = /^([0-3]\d)-([0-1]\d)-(\d{4})$/.exec(String(s || "").trim());
      if (!m) return null;
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
      return new Date(yyyy, mm - 1, dd);
    };

    return normalized.sort((a, b) => {
      const da = parseDDMMYYYY(a.date);
      const db = parseDDMMYYYY(b.date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
  }, [history]);

  const openDayModal = (day) => {
    setActiveDay(day);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveDay(null);
  };

  const activeLocations = useMemo(() => {
    const locs = Array.isArray(activeDay?.locations) ? activeDay.locations : [];
    return locs
      .map((l, idx) => {
        const id = String(l?.id || "");
        const latitude = Number(l?.latitude ?? l?.lat);
        const longitude = Number(l?.longitude ?? l?.lng);
        const createdAt = l?.created_at ?? l?.createdAt;
        return {
          key: id || `${idx}`,
          latitude,
          longitude,
          createdAt,
        };
      })
      .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude));
  }, [activeDay]);

  const tileUrl = themes.find((t) => t.id === "streets")?.url || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

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

  return (
    <>
      <div className="d-flex justify-content-center mb-3">
        <lottie-player
          src="https://assets10.lottiefiles.com/packages/lf20_myejiggj.json"
          background="transparent"
          speed="1"
          style={{ width: "min(60vw, 300px)", height: "auto" }}
          loop
          autoplay
        ></lottie-player>
      </div>
      <div className="mb-3 fw-bold text-center fs-4">WELCOME BACK, {user.name.toUpperCase()}</div>
      <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
        <span className={`d-inline-block rounded-circle ${isOnline ? "bg-success" : "bg-secondary"}`} style={{ width: 10, height: 10 }} />
        <span style={{ fontSize: "0.9rem" }}>{isOnline ? "Online" : "Offline"}</span>
      </div>

      <hr />
      <div className="mb-3 fw-bold text-center fs-5">Route History</div>

      {loadingHistory && <div className="text-center text-muted py-2">Loading history...</div>}
      {!loadingHistory && historyError && <div className="text-center text-danger py-2">{historyError}</div>}

      {!loadingHistory && !historyError && renderedHistory.length === 0 && (
        <div className="text-center text-muted py-2">No history yet.</div>
      )}

      {!loadingHistory && !historyError && renderedHistory.length > 0 && (
        <div className="list-group">
          {renderedHistory.map((day) => (
            <div key={day.key} className="list-group-item d-flex justify-content-between align-items-center">
              <div className="me-3">
                <div className="fw-semibold">{day.date}</div>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {Array.isArray(day.locations) ? day.locations.length : 0} titik
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => openDayModal(day)}>
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">History: {activeDay?.date || "-"}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                </div>
                <div className="modal-body">
                  {activeLocations.length === 0 ? (
                    <div className="text-muted">No locations for this date.</div>
                  ) : (
                    <div style={{ height: "60vh", width: "100%" }}>
                      <MapContainer
                        key={activeDay?.date || "history"}
                        center={[activeLocations[0].latitude, activeLocations[0].longitude]}
                        zoom={16}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={true}
                      >
                        <TileLayer url={tileUrl} />
                        <FitBounds points={activeLocations} />
                        {activeLocations.map((p) => (
                          <CircleMarker
                            key={p.key}
                            center={[p.latitude, p.longitude]}
                            radius={5}
                            pathOptions={{ color: "#fff", weight: 2, fillColor: "#1e3a5f", fillOpacity: 0.85 }}
                          />
                        ))}
                      </MapContainer>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeModal} />
        </>
      )}
    </>
  );
};

export default ProfilePanel;
