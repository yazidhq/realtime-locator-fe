import { useAuth } from "../../context/auth/authContext";
import { useAsyncStatus } from "../../hooks/useAsyncStatus";

const Logout = () => {
  const { handleLogout } = useAuth();

  const { loading, error, success, runAsync } = useAsyncStatus();

  const submitLogout = async (e) => {
    e.preventDefault();
    const result = await runAsync(async () => await handleLogout(), "Logout successfully");
    if (result.ok) {
      window.location.href = window.location.origin;
    }
  };

  return (
    <div>
      {error && <div className="text-danger mb-2">{error}</div>}
      {success && <div className="text-success mb-2">{success}</div>}
      <form onSubmit={submitLogout}>
        <div className="d-grid gap-2 mt-4">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Logout"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Logout;
