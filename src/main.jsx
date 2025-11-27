import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/auth/AuthContext.jsx";
import { ContactProvider } from "./context/contact/ContactContext.jsx";
import { UserProvider } from "./context/user/userContext.jsx";
import { GroupProvider } from "./context/group/GroupContext.jsx";
import { GroupParticipantProvider } from "./context/groupParticipant/GroupParticipantContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <UserProvider>
        <ContactProvider>
          <GroupProvider>
            <GroupParticipantProvider>
              <App />
            </GroupParticipantProvider>
          </GroupProvider>
        </ContactProvider>
      </UserProvider>
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
