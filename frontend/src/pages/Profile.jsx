import { useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

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
      await api.patch("/auth/me/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Password updated successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Could not update password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>My Profile</h1>

      <div className="card">
        <h3>Account details</h3>
        <table>
          <tbody>
            <tr><th>Name</th><td>{user?.firstName} {user?.lastName}</td></tr>
            <tr><th>Employee code</th><td>{user?.employeeCode || "-"}</td></tr>
            <tr><th>Email</th><td>{user?.email}</td></tr>
            <tr><th>Role</th><td>{user?.role}</td></tr>
            <tr><th>Position</th><td>{user?.position || "-"}</td></tr>
            <tr><th>Department</th><td>{user?.department?.name || "-"}</td></tr>
            <tr><th>Manager</th><td>{user?.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "-"}</td></tr>
            <tr><th>Status</th><td><span className={`badge ${user?.status}`}>{user?.status}</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Change password</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password" placeholder="Current password" required
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
          {success && <p style={{ color: "var(--success)", fontSize: 13 }}>{success}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Updating..." : "Update password"}</button>
        </form>
      </div>
    </div>
  );
}
