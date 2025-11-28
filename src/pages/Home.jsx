import LeafletMap from "../components/map/LeafletMap";
import themes from "../assets/map-themes";
import { usePanelToggle } from "../hooks/usePanelToggle";
import { useEffect, useRef } from "react";
import MasterPanel from "../components/template/panel/MasterPanel";
import MasterControl from "../components/template/control/MasterControl";

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

      <MasterControl mapHandleRef={mapHandleRef} mapObjRef={mapObjRef} />

      <MasterPanel activePanel={activePanel} togglePanel={togglePanel} />
    </div>
  );
};

export default Home;
