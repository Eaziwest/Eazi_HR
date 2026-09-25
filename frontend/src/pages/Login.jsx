import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [idleNotice, setIdleNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("logoutReason") === "idle") {
      setIdleNotice(true);
      sessionStorage.removeItem("logoutReason");
    }
  }, []);

  // Already logged in? Skip straight past the login form.
  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIdleNotice(false);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "var(--gradient)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, color: "#06070d", fontSize: 16, flexShrink: 0,
          }}>E</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Eazi HR</h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>Sign in to your workspace</p>
          </div>
        </div>
        {idleNotice && (
          <p style={{ fontSize: 13, color: "var(--warn)", background: "rgba(255,182,72,0.1)", border: "1px solid rgba(255,182,72,0.3)", borderRadius: 10, padding: "8px 12px", marginTop: 0 }}>
            You were signed out after 2 minutes of inactivity, to keep your account secure. Please log in again.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Logging in..." : "Log in"}</button>
        </form>
      </div>
    </div>
  );
}
