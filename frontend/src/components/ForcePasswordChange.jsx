import { useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ForcePasswordChange() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation don't match");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patch("/auth/me/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (res.data.token) localStorage.setItem("token", res.data.token);
      setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
    } catch (err) {
      setError(getErrorMessage(err, "Could not update password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="card">
        <h1 style={{ fontSize: 19, marginBottom: 4 }}>Set a new password</h1>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 0, marginBottom: 18 }}>
          Hi {user?.firstName}, your account was set up with a temporary password.
          Please choose a new one before continuing to Eazi HR.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password" placeholder="Temporary / current password" required
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <input
            type="password" placeholder="New password (min. 6 characters)" required
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <input
            type="password" placeholder="Confirm new password" required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Updating..." : "Set new password"}</button>
        </form>
        <button type="button" className="secondary" style={{ marginTop: 10 }} onClick={logout}>
          Log out instead
        </button>
      </div>
    </div>
  );
}
