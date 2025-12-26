import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/auth/AuthProvider.jsx";
import { RealtimeProvider } from "./context/realtime/RealtimeProvider.jsx";
import { UserProvider } from "./context/user/UserProvider.jsx";
import { LocationProvider } from "./context/location/LocationProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <RealtimeProvider>
        <UserProvider>
          <LocationProvider>
            <App />
          </LocationProvider>
        </UserProvider>
      </RealtimeProvider>
    </AuthProvider>
  </StrictMode>
);

// Register service worker (only in supported environments)
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
  });
}
