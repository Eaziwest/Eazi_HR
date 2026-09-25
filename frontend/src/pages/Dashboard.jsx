import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  IconCalendarOff, IconThermometer, IconChecklist, IconUsers, IconStar,
  IconMegaphone, IconClock, IconAddressBook,
} from "../components/icons";

const CHART_COLORS = ["#4a7dff", "#22c3a6", "#ffb648", "#ff5c72", "#7aa2ff", "#2fd680"];

function formatDuration(startIso, endIso) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const totalMins = Math.max(0, Math.round((end - start) / 60000));
  return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";

  const [balance, setBalance] = useState(null);
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [overview, setOverview] = useState(null);

  const [clockStatus, setClockStatus] = useState(null);
  const [clockActing, setClockActing] = useState(false);
  const [clockError, setClockError] = useState("");

  const [myLeaves, setMyLeaves] = useState([]);
  const [mySick, setMySick] = useState([]);

  function loadClockStatus() { api.get("/attendance/me/status").then((res) => setClockStatus(res.data)).catch(() => {}); }

  useEffect(() => {
    api.get("/leaves/balance").then((res) => setBalance(res.data)).catch(() => {});
    api.get("/onboarding/me").then((res) => setOnboardingTasks(res.data)).catch(() => {});
    api.get("/announcements").then((res) => setAnnouncements(res.data.slice(0, 3))).catch(() => {});
    api.get("/leaves/me").then((res) => setMyLeaves(res.data)).catch(() => {});
    api.get("/sick-leaves/me").then((res) => setMySick(res.data)).catch(() => {});
    loadClockStatus();
    if (isHR) api.get("/insights/overview").then((res) => setOverview(res.data)).catch(() => {});
  }, []);

  const pendingTasks = onboardingTasks.filter((t) => !t.completed).length;

  const recentRequests = [
    ...myLeaves.map((l) => ({ id: `leave-${l.id}`, kind: "Leave", type: l.type, status: l.status, date: l.createdAt, startDate: l.startDate, endDate: l.endDate })),
    ...mySick.map((s) => ({ id: `sick-${s.id}`, kind: "Sick leave", type: null, status: s.status, date: s.createdAt, startDate: s.startDate, endDate: s.endDate })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  async function clockIn() {
    setClockError(""); setClockActing(true);
    try { await api.post("/attendance/clock-in"); loadClockStatus(); }
    catch (err) { setClockError(getErrorMessage(err, "Could not clock in")); }
    finally { setClockActing(false); }
  }
  async function clockOut() {
    setClockError(""); setClockActing(true);
    try { await api.post("/attendance/clock-out"); loadClockStatus(); }
    catch (err) { setClockError(getErrorMessage(err, "Could not clock out")); }
    finally { setClockActing(false); }
  }

  const quickLinks = [
    { to: "/attendance", label: "Attendance", desc: "Clock in/out & hours", icon: IconClock },
    { to: "/leaves", label: "Leaves", desc: "Request time off", icon: IconCalendarOff },
    { to: "/sick-leaves", label: "Sick Leaves", desc: "Report an illness", icon: IconThermometer },
    { to: "/appraisals", label: "Appraisals", desc: "Performance reviews", icon: IconStar },
    { to: "/onboarding", label: "Onboarding", desc: "Your checklist", icon: IconChecklist },
    { to: "/directory", label: "Directory", desc: "Find a colleague", icon: IconAddressBook },
  ];

  return (
    <div>
      <h1>Welcome, {user?.firstName} 👋</h1>
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

      <div className="stat-grid">
        <div className="card" style={{ flex: "1 1 26 0px" }}>
          <div className="card-header">
            <span className="card-header-title"><span className="card-icon"><IconClock /></span><h3>Today</h3></span>
          </div>
          <div className="clock-status" style={{ marginBottom: 14 }}>
            <span className={`clock-dot ${clockStatus?.clockedIn ? "on" : ""}`}></span>
            {clockStatus?.clockedIn
              ? `Clocked in since ${new Date(clockStatus.openEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${formatDuration(clockStatus.openEntry.clockIn)}`
              : "You're not clocked in yet"}
          </div>
          {clockError && <p className="error-text">{clockError}</p>}
          {clockStatus?.clockedIn ? (
            <button onClick={clockOut} disabled={clockActing}>{clockActing ? "..." : "Clock out"}</button>
          ) : (
            <button onClick={clockIn} disabled={clockActing}>{clockActing ? "..." : "Clock in"}</button>
          )}
        </div>

        <div className="card" style={{ flex: "2 1 380px" }}>
          <div className="card-header">
            <span className="card-header-title"><span className="card-icon"><IconCalendarOff /></span><h3>My recent requests</h3></span>
          </div>
          {recentRequests.length === 0 && <p style={{ color: "var(--text-dim)" }}>No leave or sick leave requests yet.</p>}
          <div className="tx-list">
            {recentRequests.map((r) => (
              <div className="tx-row" key={r.id}>
                <span className="tx-icon">{r.kind === "Leave" ? <IconCalendarOff /> : <IconThermometer />}</span>
                <div className="tx-main">
                  <p className="tx-title">{r.kind}{r.type ? ` · ${r.type}` : ""}</p>
                  <p className="tx-sub">{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${r.status}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isHR && overview && (
        <div className="stat-grid">
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <div className="card-header">
              <span className="card-header-title"><span className="card-icon"><IconUsers /></span><h3>Headcount by department</h3></span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
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
            <ResponsiveContainer width="100%" height={220}>
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

      <div className="card">
        <h3>Quick links</h3>
        <div className="quicklink-grid">
          {quickLinks.map((q) => (
            <NavLink to={q.to} className="quicklink-tile" key={q.to}>
              <span className="card-icon"><q.icon /></span>
              <span>
                <span className="quicklink-title">{q.label}</span>
                <span className="quicklink-desc">{q.desc}</span>
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
