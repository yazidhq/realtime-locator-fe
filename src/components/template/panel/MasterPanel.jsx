import { useAuth } from "../../../context/auth/authContext";
import PanelButton from "../../button/PanelButton";
import AuthForm from "../../auth/AuthForm";
import SettingPanel from "../../panel/SettingPanel";
import ProfilePanel from "../../panel/ProfilePanel";
import { Settings, User, Users } from "lucide-react";
import UsersPanel from "../../panel/UsersPanel";

const MasterPanel = ({ activePanel, togglePanel }) => {
  const { isAuthenticated } = useAuth();

  const panelButtons = [
    { id: "profile", icon: <User /> },
    { id: "users", icon: <Users /> },
    { id: "setting", icon: <Settings /> },
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
            onClose={() => togglePanel(btn.id)}
            value={btn.icon}
            top={top}
            disabled={!isAuthenticated && btn.id !== "profile"}
            active={Boolean(activePanel === btn.id)}
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

          {activePanel === "setting" && (
            <div className="p-4" style={{ color: "#1e3a5f" }}>
              <SettingPanel />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MasterPanel;
