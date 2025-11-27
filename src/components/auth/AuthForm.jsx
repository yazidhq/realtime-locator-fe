import { useState } from "react";
import { useAuth } from "../../context/auth/authContext";
import { useAsyncStatus } from "../../hooks/useAsyncStatus";

const AuthForm = () => {
  const { handleLogin } = useAuth();
  const { loading, error, success, runAsync, resetStatus } = useAsyncStatus();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    resetStatus();
  };

  const submit = async (e) => {
    e.preventDefault();
    resetStatus();

    await runAsync(async () => {
      const res = await handleLogin({ email: form.email, password: form.password });
      if (!res?.ok) throw new Error(res?.error || "Failed sign in");
      return res;
    }, "Sign in successfully");
  };

  return (
    <div>
      <div className="d-flex justify-content-center mb-3">
        <lottie-player
          src="https://assets8.lottiefiles.com/packages/lf20_uUiMgkSnl3.json"
          background="transparent"
          speed="1"
          style={{ width: "min(60vw, 300px)", height: "auto" }}
          loop
          autoplay
        ></lottie-player>
      </div>

      <div className="mb-5 text-center">
        <p>Hello There!</p>
        <h3 className="fw-bold">Let’s Get You Signed In</h3>
      </div>

      <form onSubmit={submit}>
        <div className="mb-2">
          <label className="form-label">Email</label>
          <input name="email" value={form.email} onChange={onChange} className="form-control" type="email" required />
        </div>

        <div className="mb-2">
          <label className="form-label">Password</label>
          <input name="password" value={form.password} onChange={onChange} className="form-control" type="password" required />
        </div>

        {error && <div className="text-danger mb-2">{error}</div>}
        {success && <div className="text-success mb-2">{success}</div>}

        <div className="d-grid gap-2 mt-4">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthForm;
