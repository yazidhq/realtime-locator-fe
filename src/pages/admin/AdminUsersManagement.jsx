import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, RefreshCcw } from "lucide-react";
import { useUser } from "../../context/user/userContext";

const getUserId = (u) => String(u?.id || u?.user_id || u?.userId || u?.uuid || "");

const emptyForm = {
  name: "",
  username: "",
  email: "",
  phone_number: "",
  password: "",
  role: "member",
};

const AdminUsersManagement = () => {
  const { handleGetAll, handleCreate, handleUpdate, handleRemove } = useUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  // Only show users with role 'member'
  const [roleFilter] = useState("member");

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [modalOpen, setModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await handleGetAll({ limit: 0 });
      if (!res?.ok) throw new Error(res?.error || "Failed to load users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const query = q.trim().toLowerCase();

    return (Array.isArray(users) ? users : [])
      .filter((u) => String(u?.role || "").toLowerCase() === "member")
      .filter((u) => {
        if (!query) return true;
        const id = getUserId(u);
        const name = String(u?.name || "");
        const username = String(u?.username || "");
        const email = String(u?.email || "");
        return [id, name, username, email].some((x) => String(x).toLowerCase().includes(query));
      });
  }, [users, q, roleFilter]);

  const openCreate = () => {
    setModalMode("create");
    setActiveUser(null);
    setForm({ ...emptyForm });
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setModalMode("edit");
    setActiveUser(u);
    setForm({
      name: String(u?.name || ""),
      username: String(u?.username || ""),
      email: String(u?.email || ""),
      phone_number: String(u?.phone_number || u?.phone || ""),
      password: "",
      role: String(u?.role || "member"),
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setSaveError(null);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        name: form.name.trim() || undefined,
        username: form.username.trim() || undefined,
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
        role: form.role || undefined,
      };

      // Only send password when provided
      if (form.password && form.password.trim()) {
        payload.password = form.password;
      }

      if (modalMode === "create") {
        if (!payload.username && !payload.email) throw new Error("Username or email is required");
        if (!payload.password) throw new Error("Password is required");

        const res = await handleCreate(payload);
        if (!res?.ok) throw new Error(res?.error || "Failed to create user");
      } else if (modalMode === "edit") {
        const id = getUserId(activeUser);
        if (!id) throw new Error("Missing user id");
        const res = await handleUpdate(id, payload);
        if (!res?.ok) throw new Error(res?.error || "Failed to update user");
      }

      await loadUsers();
      closeModal();
    } catch (e2) {
      setSaveError(e2?.message || String(e2));
      setSaving(false);
    }
  };

  const doDelete = async (u) => {
    const id = getUserId(u);
    if (!id) return;

    const label = String(u?.username || u?.email || id);
    const ok = window.confirm(`Delete user ${label}? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await handleRemove(id);
      if (!res?.ok) throw new Error(res?.error || "Failed to delete user");
      await loadUsers();
    } catch (e) {
      window.alert(e?.message || String(e));
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-1 fw-bold">Users</h4>
          <div className="text-muted">Create, update, and delete users</div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> New User
          </button>
        </div>
      </div>

      <div className="admin-card p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-lg-6">
            <div className="input-group">
              <span className="input-group-text">
                <Search size={16} />
              </span>
              <input
                className="form-control"
                placeholder="Search by name, username, email…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-lg-3 text-muted" style={{ fontSize: "0.9rem" }}>
            {filteredUsers.length} users
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-4">Loading users…</div>
      ) : error ? (
        <div className="admin-card p-4 text-danger">{error}</div>
      ) : (
        <div className="admin-card p-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>No</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const id = getUserId(u);
                  return (
                    <tr key={id || idx}>
                      <td>{idx + 1}</td>
                      <td>{u?.name || "-"}</td>
                      <td>{u?.username || "-"}</td>
                      <td>{u?.email || "-"}</td>
                      <td>{u?.phone_number || u?.phone || "-"}</td>
                      <td>
                        <span className={`badge ${String(u?.role || "member").toLowerCase() === "admin" ? "text-bg-primary" : "text-bg-secondary"}`}>
                          {u?.role || "member"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(u)}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => doDelete(u)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simple modal (no bootstrap JS dependency) */}
      {modalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,0.45)", zIndex: 1050 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="d-flex align-items-center justify-content-center h-100 p-3">
            <div className="admin-card p-4" style={{ width: "min(620px, 100%)" }}>
              <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                <div>
                  <h5 className="mb-1 fw-bold">{modalMode === "create" ? "Create User" : "Edit User"}</h5>
                  <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                    {modalMode === "create" ? "Add a new user account" : "Update user profile details"}
                  </div>
                </div>
              </div>

              {saveError && <div className="alert alert-danger py-2">{saveError}</div>}

              <form onSubmit={submit}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Name</label>
                    <input className="form-control" name="name" value={form.name} onChange={onChange} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Username</label>
                    <input className="form-control" name="username" value={form.username} onChange={onChange} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input className="form-control" name="email" value={form.email} onChange={onChange} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" name="phone_number" value={form.phone_number} onChange={onChange} />
                  </div>
                  {/* Role is fixed to 'user' for this page, so hide the field */}

                  <div className="col-12">
                    <label className="form-label">Password {modalMode === "edit" ? "(optional)" : ""}</label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder={modalMode === "edit" ? "Leave blank to keep current password" : "Set initial password"}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagement;
