import { useState } from "react";
import { useAuth } from "../../../context/auth/authContext";
import PanelButton from "../../button/PanelButton";
import AuthForm from "../../auth/AuthForm";
import ProfilePanel from "../../panel/ProfilePanel";
import { LogOut, User, Users } from "lucide-react";
import UsersPanel from "../../panel/UsersPanel";

const MasterPanel = ({ activePanel, togglePanel }) => {
  const { isAuthenticated, handleLogout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const doLogout = async () => {
    if (!isAuthenticated || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const res = await handleLogout();
      if (res?.ok) window.location.href = window.location.origin;
    } finally {
      setIsLoggingOut(false);
    }
  };

  const panelButtons = [
    { id: "profile", icon: <User /> },
    { id: "users", icon: <Users /> },
    { id: "logout", icon: <LogOut /> },
  ];

  return (
    <>
      {panelButtons.map((btn, i) => {
        let panelTop = 10;
        let btnSize = 40;
        let gap = 12;
        try {
          const style = getComputedStyle(document.documentElement);
          panelTop = parseInt(style.getPropertyValue("--panel-top")) || panelTop;
          btnSize = parseInt(style.getPropertyValue("--button-size")) || btnSize;
          gap = parseInt(style.getPropertyValue("--button-gap")) || gap;
        } catch (err) {
          console.log(err);
        }

        const top = panelTop + i * (btnSize + gap);

        return (
          <PanelButton
            key={btn.id}
            onClose={() => (btn.id === "logout" ? doLogout() : togglePanel(btn.id))}
            value={btn.icon}
            top={top}
            disabled={btn.id === "profile" ? false : btn.id === "logout" ? !isAuthenticated || isLoggingOut : !isAuthenticated}
            active={btn.id === "logout" ? false : Boolean(activePanel === btn.id)}
            index={i}
          />
        );
      })}

      <div className={`panel-template ${activePanel ? "open" : "closed"}`}>
        <div className="panel-body">
          {activePanel === "profile" && (
            <div className="p-4" style={{ color: "#1e3a5f" }}>
              {isAuthenticated ? <ProfilePanel /> : <AuthForm />}
            </div>
          )}

          {activePanel === "users" && (
            <div className="p-4" style={{ color: "#1e3a5f" }}>
              <UsersPanel />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MasterPanel;
