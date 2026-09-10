import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const CHART_COLORS = ["#7c5cff", "#00d9c0", "#ff4fd8", "#ffc857", "#ff5c7a", "#2fe6a0"];

export default function Dashboard() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";

  const [balance, setBalance] = useState(null);
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get("/leaves/balance").then((res) => setBalance(res.data)).catch(() => {});
    api.get("/onboarding/me").then((res) => setOnboardingTasks(res.data)).catch(() => {});
    api.get("/announcements").then((res) => setAnnouncements(res.data.slice(0, 3))).catch(() => {});
    if (isHR) api.get("/insights/overview").then((res) => setOverview(res.data)).catch(() => {});
  }, []);

  const pendingTasks = onboardingTasks.filter((t) => !t.completed).length;

  return (
    <div>
      <h1>Welcome, {user?.firstName} 👋</h1>
      <p style={{ color: "var(--text-dim)" }}>
        {user?.position} · {user?.department?.name || "No department assigned"} ·{" "}
        <span className={`badge ${user?.status}`}>{user?.status}</span>
      </p>

      <div className="stat-grid">
        <div className="card stat-card">
          <h3>{balance ? balance.annualEntitlement - balance.annualUsed : "-"}</h3>
          <p>Annual leave days remaining</p>
        </div>
        <div className="card stat-card">
          <h3>{balance ? balance.sickEntitlement - balance.sickUsed : "-"}</h3>
          <p>Sick leave days remaining</p>
        </div>
        <div className="card stat-card">
          <h3>{pendingTasks}</h3>
          <p>Onboarding tasks pending</p>
        </div>
      </div>

      {isHR && overview && (
        <div className="stat-grid">
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h3>Headcount by department</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview.headcountByDepartment}>
                <XAxis dataKey="department" stroke="#6b7398" fontSize={11} />
                <YAxis stroke="#6b7398" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0b0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e7eaf6" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#7c5cff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h3>Leave requests by status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={overview.leavesByStatus} dataKey="count" nameKey="status" outerRadius={80} label>
                  {overview.leavesByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0b0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e7eaf6" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Latest announcements</h3>
        {announcements.length === 0 && <p style={{ color: "var(--text-dim)" }}>No announcements yet.</p>}
        {announcements.map((a) => (
          <div className="announcement" key={a.id}>
            <p className="announcement-title">{a.pinned && <span className="pin-badge">PINNED</span>}{a.title}</p>
            <p className="announcement-meta">{a.author.firstName} {a.author.lastName} · {new Date(a.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Quick links</h3>
        <ul>
          <li>Clock in/out and view your hours under <strong>Attendance</strong></li>
          <li>Request time off under <strong>Leaves</strong></li>
          <li>Report an illness under <strong>Sick Leaves</strong></li>
          <li>Check your performance reviews under <strong>Appraisals</strong></li>
          <li>Track your new-hire checklist under <strong>Onboarding</strong></li>
          <li>Find a colleague under <strong>Directory</strong></li>
        </ul>
      </div>
    </div>
  );
}
