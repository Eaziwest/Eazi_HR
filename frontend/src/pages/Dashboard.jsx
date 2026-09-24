import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IconCalendarOff, IconThermometer, IconChecklist, IconUsers, IconStar, IconMegaphone } from "../components/icons";

const CHART_COLORS = ["#4a7dff", "#22c3a6", "#ffb648", "#ff5c72", "#7aa2ff", "#2fd680"];

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
      <h1>Welcome, {user?.firstName} 😊</h1>
      <p style={{ color: "var(--text-dim)" }}>
        {user?.position} · {user?.department?.name || "No department assigned"} ·{" "}
        <span className={`badge ${user?.status}`}>{user?.status}</span>
      </p>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label"><span className="card-icon"><IconCalendarOff /></span>Annual Leave</span>
          </div>
          <h3>{balance ? balance.annualEntitlement - balance.annualUsed : "-"}</h3>
          <p>days remaining of {balance?.annualEntitlement ?? "-"}</p>
        </div>
        <div className="card stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label"><span className="card-icon"><IconThermometer /></span>Sick Leave</span>
          </div>
          <h3>{balance ? balance.sickEntitlement - balance.sickUsed : "-"}</h3>
          <p>days remaining of {balance?.sickEntitlement ?? "-"}</p>
        </div>
        <div className="card stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label"><span className="card-icon"><IconChecklist /></span>Onboarding</span>
          </div>
          <h3>{pendingTasks}</h3>
          <p>tasks pending</p>
        </div>
      </div>

      {isHR && overview && (
        <div className="stat-grid">
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <div className="card-header">
              <span className="card-header-title"><span className="card-icon"><IconUsers /></span><h3>Headcount by department</h3></span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.headcountByDepartment}>
                <defs>
                  <linearGradient id="deptBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8fb0ff" />
                    <stop offset="100%" stopColor="#4a7dff" />
                  </linearGradient>
                  <linearGradient id="deptBarActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#4a7dff" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="department" stroke="#6b6f80" fontSize={11} />
                <YAxis stroke="#6b6f80" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  contentStyle={{ background: "#131419", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f2f3f7" }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="url(#deptBar)"
                  activeBar={{ fill: "url(#deptBarActive)", stroke: "#8fb0ff", strokeWidth: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <div className="card-header">
              <span className="card-header-title"><span className="card-icon"><IconStar /></span><h3>Leave requests by status</h3></span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={overview.leavesByStatus} dataKey="count" nameKey="status" outerRadius={80} label>
                  {overview.leavesByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#131419", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f2f3f7" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-header-title"><span className="card-icon"><IconMegaphone /></span><h3>Latest announcements</h3></span>
        </div>
        {announcements.length === 0 && <p style={{ color: "var(--text-dim)" }}>No announcements yet.</p>}
        {announcements.map((a) => (
          <div className="announcement" key={a.id}>
            <p className="announcement-title">{a.pinned && <span className="pin-badge">PINNED</span>}{a.title}</p>
            <p className="announcement-meta">{a.author.firstName} {a.author.lastName} · {new Date(a.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      
    </div>
  );
}
