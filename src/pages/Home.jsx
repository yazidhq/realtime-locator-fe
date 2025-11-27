import LeafletMap from "../components/map/LeafletMap";
import themes from "../assets/map-themes";
import MasterPanel from "../components/panel/MasterPanel";
import { usePanelToggle } from "../hooks/usePanelToggle";
import ControlButton from "../components/button/ControlButton";
import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";

const Home = () => {
  const { activePanel, togglePanel } = usePanelToggle(false, 100);

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
      <LeafletMap theme={"streets"} tileUrl={themes.find((t) => t.id === "streets")?.url} />

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
        title="Refresh page"
        icon={<RefreshCcw size={"15px"} />}
      />

      <MasterPanel activePanel={activePanel} togglePanel={togglePanel} />
    </div>
  );
};

export default Home;
