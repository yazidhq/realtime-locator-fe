import LeafletMap from "../components/map/LeafletMap";
import themes from "../assets/map-themes";
import MasterPanel from "../components/panel/MasterPanel";
import { usePanelToggle } from "../hooks/usePanelToggle";
import ControlButton from "../components/button/ControlButton";
import { useEffect, useRef } from "react";
import { RefreshCcw, Crosshair } from "lucide-react";

const Home = () => {
  const { activePanel, togglePanel } = usePanelToggle(false, 100);
  const mapHandleRef = useRef(null); // imperative handle from LeafletMap
  const mapObjRef = useRef(null); // raw Leaflet map instance (fallback)

  useEffect(() => {
    const src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-player/2.0.12/lottie-player.js";
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="position-relative" style={{ height: "100vh" }}>
      <LeafletMap
        ref={mapHandleRef}
        onMapReady={(m) => (mapObjRef.current = m)}
        theme={"streets"}
        tileUrl={themes.find((t) => t.id === "streets")?.url}
      />

      <div className="control-button-group">
        <ControlButton
          onClick={async () => {
            try {
              if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              }

              if (window.caches && caches.keys) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
            } catch (err) {
              console.warn("Refresh: cleanup failed", err);
            }

            window.location.reload();
          }}
          className="stacked"
          title="Refresh page"
          icon={<RefreshCcw size={"15px"} />}
        />

        <ControlButton
          onClick={async () => {
            try {
              if (mapHandleRef.current && mapHandleRef.current.recenterToCurrentLocation) {
                mapHandleRef.current.recenterToCurrentLocation();
                return;
              }

              if (mapObjRef.current && navigator?.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    if (!pos || !pos.coords) return;
                    const latlng = [pos.coords.latitude, pos.coords.longitude];
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
          icon={<Crosshair size={"15px"} />}
        />
      </div>

      <MasterPanel activePanel={activePanel} togglePanel={togglePanel} />
    </div>
  );
};

export default Home;
