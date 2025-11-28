import ControlButton from "../../button/ControlButton";
import { RefreshCcw, Crosshair } from "lucide-react";

const MasterControl = ({ mapHandleRef, mapObjRef }) => {
  return (
    <div className="control-button-group">
      <ControlButton
        onClick={async () => {
          try {
            if (navigator.serviceWorker?.getRegistrations) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }

            if (window.caches?.keys) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
          } catch (err) {
            console.warn("Refresh: cleanup failed", err);
          }

          window.location.reload();
        }}
        className="stacked"
        title="Total Refresh"
        icon={<RefreshCcw size="20px" />}
      />

      <ControlButton
        onClick={async () => {
          try {
            // PRIORITY 1 — gunakan recenterToCurrentLocation() dari LeafletMap
            if (mapHandleRef.current?.recenterToCurrentLocation) {
              mapHandleRef.current.recenterToCurrentLocation();
              return;
            }

            // PRIORITY 2 — fallback: panggil navigator.geolocation manual
            if (mapObjRef.current && navigator?.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords || {};
                  if (!latitude || !longitude) return;

                  const latlng = [latitude, longitude];
                  const preferredZoom = Math.max(mapObjRef.current.getZoom(), 16);

                  try {
                    mapObjRef.current.setView(latlng, preferredZoom);
                  } catch (err) {
                    console.warn("Fallback setView failed", err);
                  }
                },
                (err) => {
                  console.warn("Geolocation failed", err);
                },
                { enableHighAccuracy: true, timeout: 5000 }
              );
              return;
            }

            console.warn("Map ref not available");
          } catch (err) {
            console.warn("Recenter failed", err);
          }
        }}
        className="stacked"
        title="Go to current location"
        icon={<Crosshair size="20px" />}
      />
    </div>
  );
};

export default MasterControl;
