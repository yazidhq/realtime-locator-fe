import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth/authContext";
import { useUser } from "../../context/user/userContext";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminSettings = () => {
  const { user: authUser } = useAuth();
  const { handleGetAll, handleGetById, handleCreate, handleUpdate, handleRemove } = useUser();
  // Admin user management state
  const adminEmptyForm = { name: "", username: "", email: "", phone_number: "", password: "", role: "admin" };
  const [admins, setAdmins] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminModalMode, setAdminModalMode] = useState(null); // 'create' | 'edit'
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminActiveUser, setAdminActiveUser] = useState(null);
  const [adminForm, setAdminForm] = useState(adminEmptyForm);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaveError, setAdminSaveError] = useState(null);

  const loadAdmins = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await handleGetAll({ limit: 0 });
      if (!res?.ok) throw new Error(res?.error || "Failed to load admins");
      setAdmins((Array.isArray(res.data) ? res.data : []).filter((u) => String(u?.role || "").toLowerCase() === "admin"));
    } catch (e) {
      setAdminError(e?.message || String(e));
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const filteredAdmins = useMemo(() => admins, [admins]);

  const openAdminCreate = () => {
    setAdminModalMode("create");
    setAdminActiveUser(null);
    setAdminForm({ ...adminEmptyForm });
    setAdminSaveError(null);
    setAdminModalOpen(true);
  };
  const openAdminEdit = (u) => {
    setAdminModalMode("edit");
    setAdminActiveUser(u);
    setAdminForm({
      name: String(u?.name || ""),
      username: String(u?.username || ""),
      email: String(u?.email || ""),
      phone_number: String(u?.phone_number || u?.phone || ""),
      password: "",
      role: "admin",
    });
    setAdminSaveError(null);
    setAdminModalOpen(true);
  };
  const closeAdminModal = () => {
    setAdminModalOpen(false);
    setAdminSaving(false);
    setAdminSaveError(null);
  };
  const onAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };
  const submitAdmin = async (e) => {
    e.preventDefault();
    setAdminSaving(true);
    setAdminSaveError(null);
    try {
      const payload = {
        name: adminForm.name.trim() || undefined,
        username: adminForm.username.trim() || undefined,
        email: adminForm.email.trim() || undefined,
        phone_number: adminForm.phone_number.trim() || undefined,
        role: "admin",
      };
      if (adminForm.password && adminForm.password.trim()) payload.password = adminForm.password;
      if (adminModalMode === "create") {
        if (!payload.username && !payload.email) throw new Error("Username or email is required");
        if (!payload.password) throw new Error("Password is required");
        const res = await handleCreate(payload);
        if (!res?.ok) throw new Error(res?.error || "Failed to create admin");
      } else if (adminModalMode === "edit") {
        const id = String(adminActiveUser?.id || adminActiveUser?.user_id || "");
        if (!id) throw new Error("Missing admin id");
        const res = await handleUpdate(id, payload);
        if (!res?.ok) throw new Error(res?.error || "Failed to update admin");
      }
      await loadAdmins();
      closeAdminModal();
    } catch (e2) {
      setAdminSaveError(e2?.message || String(e2));
      setAdminSaving(false);
    }
  };
  const doAdminDelete = async (u) => {
    const id = String(u?.id || u?.user_id || "");
    if (!id) return;
    const label = String(u?.username || u?.email || id);
    const ok = window.confirm(`Delete admin ${label}? This cannot be undone.`);
    if (!ok) return;
    try {
      const res = await handleRemove(id);
      if (!res?.ok) throw new Error(res?.error || "Failed to delete admin");
      await loadAdmins();
    } catch (e) {
      window.alert(e?.message || String(e));
    }
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const id = String(authUser?.id || "");
      if (!id) return;

      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await handleGetById(id);
        const row = res?.ok ? res.data : null;

        if (!mounted) return;
        setForm({
          name: row?.name ?? authUser?.name ?? "",
          email: row?.email ?? authUser?.email ?? "",
          username: row?.username ?? "",
        });
      } catch (e) {
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [authUser?.id, authUser?.name, authUser?.email, handleGetById]);

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const id = String(authUser?.id || "");
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        username: form.username,
      };

      const res = await handleUpdate(id, payload);
      if (!res?.ok) throw new Error(res?.error || "Failed to update profile");

      setSuccess("Profile updated");
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="container-fluid p-0">
        <div className="mb-3">
          <h4 className="mb-1 fw-bold">Admin Settings</h4>
        </div>

        <div className="admin-card p-3">
          {loading ? (
            <div className="text-muted">Loading profile…</div>
          ) : (
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Name</label>
                  <input className="form-control" name="name" value={form.name} onChange={onChange} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Username</label>
                  <input className="form-control" name="username" value={form.username} onChange={onChange} placeholder="admin" />
                </div>
                <div className="col-12">
                  <label className="form-label">Email</label>
                  <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required />
                </div>

                {error && <div className="col-12 text-danger">{error}</div>}
                {success && <div className="col-12 text-success">{success}</div>}

                <div className="col-12 d-flex justify-content-end gap-2">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Admin user management section */}
      <div className="admin-card p-4 mt-4">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div>
            <h5 className="mb-1 fw-bold">Manage Admin</h5>
          </div>
          <button type="button" className="btn btn-primary" onClick={openAdminCreate}>
            <Plus size={18} /> New Admin
          </button>
        </div>
        {adminLoading ? (
          <div className="text-muted">Loading admins…</div>
        ) : adminError ? (
          <div className="text-danger">{adminError}</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>No</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((u, idx) => {
                  const id = String(u?.id || u?.user_id || "");
                  return (
                    <tr key={id || idx}>
                      <td>{idx + 1}</td>
                      <td>{u?.name || "-"}</td>
                      <td>{u?.username || "-"}</td>
                      <td>{u?.email || "-"}</td>
                      <td>{u?.phone_number || u?.phone || "-"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openAdminEdit(u)}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => doAdminDelete(u)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAdmins.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No admin users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Admin modal */}
        {adminModalOpen && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ background: "rgba(0,0,0,0.45)", zIndex: 1050 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeAdminModal();
            }}
          >
            <div className="d-flex align-items-center justify-content-center h-100 p-3">
              <div className="admin-card p-4" style={{ width: "min(620px, 100%)" }}>
                <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                  <div>
                    <h5 className="mb-1 fw-bold">{adminModalMode === "create" ? "Create Admin" : "Edit Admin"}</h5>
                    <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                      {adminModalMode === "create" ? "Add a new admin user" : "Update admin user details"}
                    </div>
                  </div>
                  <button type="button" className="btn btn-light" onClick={closeAdminModal}>
                    Close
                  </button>
                </div>

                {adminSaveError && <div className="alert alert-danger py-2">{adminSaveError}</div>}

                <form onSubmit={submitAdmin}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Name</label>
                      <input className="form-control" name="name" value={adminForm.name} onChange={onAdminChange} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Username</label>
                      <input className="form-control" name="username" value={adminForm.username} onChange={onAdminChange} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Email</label>
                      <input className="form-control" name="email" value={adminForm.email} onChange={onAdminChange} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input className="form-control" name="phone_number" value={adminForm.phone_number} onChange={onAdminChange} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Password {adminModalMode === "edit" ? "(optional)" : ""}</label>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={adminForm.password}
                        onChange={onAdminChange}
                        placeholder={adminModalMode === "edit" ? "Leave blank to keep current password" : "Set initial password"}
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeAdminModal} disabled={adminSaving}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={adminSaving}>
                      {adminSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminSettings;
