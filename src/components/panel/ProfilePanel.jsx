import { useAuth } from "../../context/auth/authContext";
import { CapitalizeFirstLetter } from "../../helpers/capitalized";
import { useRealtime } from "../../context/realtime/realtimeContext";

const ProfilePanel = () => {
  const { user } = useAuth();
  const { isConnected, onlineMap } = useRealtime();

  const userId = String(user?.id || "");
  const isOnline = userId
    ? (onlineMap && Object.prototype.hasOwnProperty.call(onlineMap, userId) ? !!onlineMap[userId] : isConnected)
    : isConnected;

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
      <div className="mb-3 fw-bold text-center fs-4">Welcome back, {CapitalizeFirstLetter(user.name)}</div>
      <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
        <span className={`d-inline-block rounded-circle ${isOnline ? "bg-success" : "bg-secondary"}`} style={{ width: 10, height: 10 }} />
        <span style={{ fontSize: "0.9rem" }}>{isOnline ? "Online" : "Offline"}</span>
      </div>
    </>
  );
};

export default ProfilePanel;
