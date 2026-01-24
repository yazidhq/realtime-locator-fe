import "./App.css";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Home from "./pages/Home";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMapMonitoring from "./pages/admin/AdminMapMonitoring";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsersHistory from "./pages/admin/AdminUsersHistory";
import AdminUsersManagement from "./pages/admin/AdminUsersManagement";
import RealtimeToasts from "./components/notifications/RealtimeToasts";

function App() {
  return (
    <Router>
      <RealtimeToasts />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="map" element={<AdminMapMonitoring />} />
          <Route path="users" element={<AdminUsersManagement />} />
          <Route path="users-history" element={<AdminUsersHistory />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
