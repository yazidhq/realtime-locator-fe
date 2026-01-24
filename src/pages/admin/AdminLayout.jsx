import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Map as MapIcon, Settings, Menu, LogOut, RefreshCcw, Clock, Users } from "lucide-react";
import { useAuth } from "../../context/auth/authContext";
import AuthForm from "../../components/auth/AuthForm";

const AdminLayout = () => {
  const { isAuthenticated, user, handleLogout } = useAuth();

  const doLogout = async () => {
    try {
      await handleLogout();
    } finally {
      if (user && String(user.role).toLowerCase() === "admin") {
        window.location.href = "/admin/login";
      } else {
        window.location.href = window.location.origin;
      }
    }
  };

  const doHardRefresh = async () => {
    try {
      if (navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (err) {
      console.warn("Admin refresh: cleanup failed", err);
    }

    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-shell d-flex align-items-center justify-content-center p-3">
        <div className="admin-card p-4" style={{ width: "min(520px, 100%)" }}>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div>
              <div className="admin-brand-title">Cilok TIA Admin</div>
              <div style={{ fontSize: "0.82rem", opacity: 0.8 }}>Realtime Monitoring</div>
            </div>
          </div>

          <nav className="admin-sidebar-nav d-flex flex-column h-100">
            <div className="flex-grow-1">
              <NavLink className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                to="/admin/dashboard"
                end
              >
                <LayoutDashboard size={18} />
                Dashboard
              </NavLink>

              <NavLink className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                to="/admin/map"
              >
                <MapIcon size={18} />
                Map Monitoring
              </NavLink>

              <NavLink
                className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                to="/admin/users-history"
              >
                <Clock size={18} />
                Users History
              </NavLink>

              <NavLink
                className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                to="/admin/users"
              >
                <Users size={18} />
                Manage Users
              </NavLink>
            </div>
            <div className="mt-auto pb-3">
              <NavLink className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                to="/admin/settings"
              >
                <Settings size={18} />
                Admin Settings
              </NavLink>
              <button
                type="button"
                className="admin-nav-link"
                onClick={doLogout}
                style={{ border: 0, background: "transparent", textAlign: "left" }}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        <div className="admin-content">
          <header className="admin-topbar">
            <div className="admin-topbar-inner">
              <button
                type="button"
                className="btn btn-outline-secondary d-lg-none"
                data-bs-toggle="offcanvas"
                data-bs-target="#adminSidebar"
                aria-controls="adminSidebar"
              >
                <Menu size={18} />
              </button>

              <div className="d-flex align-items-center">
                <button
                  type="button"
                  className="btn"
                  onClick={doHardRefresh}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <RefreshCcw size={18} />
                </button>
                <span className="fw-semibold">Admin Dashboard</span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                  {user?.name || user?.email || ""}
                </div>
              </div>
            </div>
          </header>

          <main className="admin-page">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile offcanvas sidebar */}
      <div
        className="offcanvas offcanvas-start text-bg-dark"
        tabIndex={-1}
        id="adminSidebar"
        aria-labelledby="adminSidebarLabel"
        style={{ width: 280 }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="adminSidebarLabel">
            Cilok TIA Admin
          </h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body">
          <nav className="admin-sidebar-nav">
            <NavLink
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              to="/admin/dashboard"
              data-bs-dismiss="offcanvas"
              end
            >
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>
            <NavLink
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              to="/admin/map"
              data-bs-dismiss="offcanvas"
            >
              <MapIcon size={18} />
              Map Monitoring
            </NavLink>
            <NavLink
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              to="/admin/settings"
              data-bs-dismiss="offcanvas"
            >
              <Settings size={18} />
              Admin Settings
            </NavLink>

            <NavLink
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              to="/admin/users"
              data-bs-dismiss="offcanvas"
            >
              <Users size={18} />
              Manage Users
            </NavLink>

            <NavLink
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              to="/admin/users-history"
              data-bs-dismiss="offcanvas"
            >
              <Clock size={18} />
              Users History
            </NavLink>

            <button
              type="button"
              className="admin-nav-link"
              data-bs-dismiss="offcanvas"
              onClick={doLogout}
              style={{ border: 0, background: "transparent", textAlign: "left" }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
