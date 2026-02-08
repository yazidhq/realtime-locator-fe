import { Mail, Phone, User, X } from "lucide-react";

const UserDetailPanel = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="user-detail-panel">
      <div className="panel-header d-flex align-items-center justify-content-between">
        <div>
          <strong>{user.username}</strong>
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>
            {user.status === "online" ? "Online" : "Offline"}
          </div>
        </div>
        <button className="btn btn-sm btn-light" onClick={onClose} aria-label="Close detail">
          <X size={18} />
        </button>
      </div>

      <div className="panel-body mt-3">
        <div className="mb-3">
          <div className="text-muted small">Name</div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <User size={16} />
            <div>{user.name}</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-muted small">Email</div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <Mail size={16} />
            <div>{user.email}</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-muted small">Phone Number</div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <Phone size={16} />
            <div>{user.phone_number}</div>
          </div>
        </div>
      </div>

      <style>{`
        .user-detail-panel {
          position: fixed;
          top: 12px;
          border-radius: 10px;
          right: calc(min(500px, 90vw) + 16px);
          height: auto;
          max-height: calc(100vh - 24px);
          width: min(350px, 90vw);
          background: #fff;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
          padding: 16px;
          z-index: 1050;
          transition: transform 220ms ease, opacity 180ms ease;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .panel-header {
          border-bottom: 1px solid #eef2ff;
          padding-bottom: 8px;
        }
        .panel-body {
          padding-bottom: 8px;
          overflow-y: auto;
        }

        @media (max-width: 576px) {
          .user-detail-panel {
            left: 12px;
            right: 12px;
            top: auto;
            bottom: 12px;
            width: auto;
            max-height: 70vh;
            border-radius: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDetailPanel;
