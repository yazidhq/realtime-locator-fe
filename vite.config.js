import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: [".ngrok-free.app"],
    proxy: {
      // Proxy websocket upgrade requests to the backend during development.
      // Use an HTTP target so the proxy can handle both HTTP and WS upgrades.
      "/api/realtime_hub": {
        // use 127.0.0.1 to avoid potential IPv6 / name resolution issues
        target: "http://127.0.0.1:3003",
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.error("vite: ws proxy error:", err);
          });
        },
      },
    },
  },
});
