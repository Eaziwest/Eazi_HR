import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IconClock, IconBarChart } from "../components/icons";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function hoursBetween(startIso, endIso) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  return Math.max(0, (end - start) / 3600000);
}

function formatDuration(startIso, endIso) {
  const totalMins = Math.round(hoursBetween(startIso, endIso) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

function monthlyHours(history) {
  const buckets = new Map();
  history.forEach((h) => {
    const d = new Date(h.clockIn);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short" });
    const hrs = hoursBetween(h.clockIn, h.clockOut);
    if (!buckets.has(key)) buckets.set(key, { key, label, hours: 0 });
    buckets.get(key).hours += hrs;
  });
  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b) => ({ ...b, hours: Math.round(b.hours * 10) / 10 }));
}

export default function Attendance() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";
  const now = useLiveClock();

  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  function loadStatus() { api.get("/attendance/me/status").then((res) => setStatus(res.data)); }
  function loadHistory() { api.get("/attendance/me/history").then((res) => setHistory(res.data)); }
  function loadTeam() { if (isHR) api.get("/attendance/today").then((res) => setTeam(res.data)); }

  useEffect(() => { loadStatus(); loadHistory(); loadTeam(); }, []);

  const chartData = useMemo(() => monthlyHours(history), [history]);

  async function clockIn() {
    setError("");
    setActing(true);
    try {
      await api.post("/attendance/clock-in");
      loadStatus(); loadHistory(); loadTeam();
    } catch (err) {
      setError(getErrorMessage(err, "Could not clock in"));
    } finally { setActing(false); }
  }

  async function clockOut() {
    setError("");
    setActing(true);
    try {
      await api.post("/attendance/clock-out");
      loadStatus(); loadHistory(); loadTeam();
    } catch (err) {
      setError(getErrorMessage(err, "Could not clock out"));
    } finally { setActing(false); }
  }

  return (
    <div>
      <h1>Attendance</h1>

      <div className="card">
        <p className="clock-display">{now.toLocaleTimeString()}</p>
        <div className="clock-status">
          <span className={`clock-dot ${status?.clockedIn ? "on" : ""}`}></span>
          {status?.clockedIn
            ? `Clocked in since ${new Date(status.openEntry.clockIn).toLocaleTimeString()} (${formatDuration(status.openEntry.clockIn)})`
            : "Not clocked in"}
        </div>
        <div>
          {error && <p className="error-text">{error}</p>}
          {status?.clockedIn ? (
            <button onClick={clockOut} disabled={acting}>{acting ? "..." : "Clock out"}</button>
          ) : (
            <button onClick={clockIn} disabled={acting}>{acting ? "..." : "Clock in"}</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-header-title"><span className="card-icon"><IconBarChart /></span><h3>Hours overview</h3></span>
        </div>
        {chartData.length === 0 ? (
          <p style={{ color: "var(--text-dim)" }}>No hours logged yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="hoursBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8fb0ff" />
                  <stop offset="100%" stopColor="#4a7dff" />
                </linearGradient>
                <linearGradient id="hoursBarActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#4a7dff" />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#6b6f80" fontSize={11} />
              <YAxis stroke="#6b6f80" fontSize={11} unit="h" />
              <Tooltip
                cursor={false}
                contentStyle={{ background: "#131419", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f2f3f7" }}
                formatter={(v) => [`${v}h`, "Hours worked"]}
              />
              <Bar
                dataKey="hours"
                radius={[6, 6, 0, 0]}
                fill="url(#hoursBar)"
                activeBar={{ fill: "url(#hoursBarActive)", stroke: "#8fb0ff", strokeWidth: 1 }}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-header-title"><span className="card-icon"><IconClock /></span><h3>My recent activity</h3></span>
        </div>
        <div className="tx-list">
          {history.map((h) => (
            <div className="tx-row" key={h.id}>
              <span className="tx-icon"><IconClock /></span>
              <div className="tx-main">
                <p className="tx-title">{new Date(h.clockIn).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</p>
                <p className="tx-sub">
                  {new Date(h.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" → "}
                  {h.clockOut ? new Date(h.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In progress"}
                </p>
              </div>
              <div className="tx-right">
                <span className="tx-duration">{formatDuration(h.clockIn, h.clockOut)}</span>
                <span className={`badge ${h.clockOut ? "ACTIVE" : "PENDING"}`}>{h.clockOut ? "Completed" : "Active"}</span>
              </div>
            </div>
          ))}
          {history.length === 0 && <p style={{ color: "var(--text-dim)" }}>No attendance recorded yet.</p>}
        </div>
      </div>

      {isHR && (
        <div className="card">
          <div className="card-header">
            <span className="card-header-title"><span className="card-icon"><IconClock /></span><h3>Team attendance today</h3></span>
          </div>
          <div className="tx-list">
            {team.map((t) => (
              <div className="tx-row" key={t.id}>
                <span className="avatar-chip small">{`${t.user.firstName?.[0] || ""}${t.user.lastName?.[0] || ""}`.toUpperCase()}</span>
                <div className="tx-main">
                  <p className="tx-title">{t.user.firstName} {t.user.lastName}</p>
                  <p className="tx-sub">{t.user.department?.name || "No department"} · {new Date(t.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" → "}
                    {t.clockOut ? new Date(t.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In progress"}
                  </p>
                </div>
                <div className="tx-right">
                  <span className="tx-duration">{formatDuration(t.clockIn, t.clockOut)}</span>
                  <span className={`badge ${t.clockOut ? "ACTIVE" : "PENDING"}`}>{t.clockOut ? "Completed" : "Active"}</span>
                </div>
              </div>
            ))}
            {team.length === 0 && <p style={{ color: "var(--text-dim)" }}>No one has clocked in today yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
