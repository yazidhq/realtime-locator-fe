import { CircleUser, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "../../context/user/userContext";
import UserDetailPanel from "./UserDetailPanel";

const UsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { handleGetAll } = useUser();
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit: 0, ["filter[role]"]: "member", ["op[role]"]: "=" };
        const res = await handleGetAll(params);
        if (!res.ok) throw new Error(res.error || "Failed to fetch users");
        if (mounted) setUsers(res.data ?? []);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load users");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      mounted = false;
    };
  }, [handleGetAll]);

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  return (
    <>
      <h5 className="mb-3 fw-bold">Users</h5>
      <div className="mt-3">
        {loading ? (
          <div className="text-center py-3 text-muted">Loading users...</div>
        ) : error ? (
          <div className="text-center py-3 text-danger">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-3 text-muted">No users found</div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="d-flex align-items-center justify-content-between p-3 bg-white rounded-4 mb-3 user-card border"
              role="button"
              onClick={() => {
                setSelectedUser(u);
                setDetailOpen(true);
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="position-relative">
                  <div className="avatar-bg rounded-circle d-flex align-items-center justify-content-center">
                    <CircleUser size={28} />
                  </div>
                  <span
                    className={`position-absolute bottom-0 end-0 rounded-circle border border-white ${getStatusColor(u.status)}`}
                    style={{ width: "12px", height: "12px" }}
                  ></span>
                </div>

                <div>
                  <span className="fw-bold text-dark">{u.username}</span>
                  <p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>
                    {u.status === "online" ? "Onlie" : "Offline"}
                    {u.location ? ` · ${u.location}` : null}
                    {u.lastActive ? ` · ${u.lastActive}` : null}
                  </p>
                </div>
              </div>

              <button className="btn btn-light rounded-pill shadow-sm px-3 d-flex align-items-center gap-1">
                <MapPin size={16} />
                <span className="d-none d-md-inline">Locate</span>
              </button>
            </div>
          ))
        )}
      </div>

      {detailOpen && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => {
            setDetailOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      <style>{`
        .avatar-bg {
          width: 48px;
          height: 48px;
          background:#eef2ff;
          transition: 0.3s;
        }
        .user-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.06) !important;
        }
        .user-card:hover .avatar-bg {
          background:#dbe4ff;
        }
      `}</style>
    </>
  );
};

export default UsersPanel;
