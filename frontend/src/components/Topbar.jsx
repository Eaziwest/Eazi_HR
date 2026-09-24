import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  IconGrid, IconClock, IconMegaphone, IconUsers, IconChecklist,
  IconCalendarOff, IconThermometer, IconStar, IconBuilding,
  IconAddressBook, IconUser, IconLogout, IconSearch, IconBell,
  IconMail, IconChevronDown, IconCheck, IconX,
} from "./icons";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  const today = new Date().toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "long", year: "numeric" });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // ---- Bell: notifications (my leave/sick decisions + announcements) ----
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const [announcements, setAnnouncements] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [mySick, setMySick] = useState([]);
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem(`notif-seen-${user?.id}`)) || 0);

  const loadNotifSources = useCallback(() => {
    api.get("/announcements").then((res) => setAnnouncements(res.data)).catch(() => {});
    api.get("/leaves/me").then((res) => setMyLeaves(res.data)).catch(() => {});
    api.get("/sick-leaves/me").then((res) => setMySick(res.data)).catch(() => {});
  }, []);

  useEffect(() => { loadNotifSources(); }, [loadNotifSources]);

  const notifications = useMemo(() => {
    const items = [];
    myLeaves.filter((l) => l.status === "APPROVED" || l.status === "REJECTED").forEach((l) => {
      items.push({
        id: `leave-${l.id}`,
        date: l.updatedAt || l.createdAt,
        title: `Leave request ${l.status.toLowerCase()}`,
        subtitle: `${l.type} · ${new Date(l.startDate).toLocaleDateString()} → ${new Date(l.endDate).toLocaleDateString()}`,
        status: l.status,
        path: "/leaves",
      });
    });
    mySick.filter((s) => s.status === "APPROVED" || s.status === "REJECTED").forEach((s) => {
      items.push({
        id: `sick-${s.id}`,
        date: s.updatedAt || s.createdAt,
        title: `Sick leave ${s.status.toLowerCase()}`,
        subtitle: `${new Date(s.startDate).toLocaleDateString()} → ${new Date(s.endDate).toLocaleDateString()}`,
        status: s.status,
        path: "/sick-leaves",
      });
    });
    announcements.forEach((a) => {
      items.push({
        id: `ann-${a.id}`,
        date: a.createdAt,
        title: a.title,
        subtitle: `Announcement · ${a.author.firstName} ${a.author.lastName}`,
        status: "ANNOUNCEMENT",
        path: "/announcements",
      });
    });
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  }, [myLeaves, mySick, announcements]);

  const unseenCount = notifications.filter((n) => new Date(n.date).getTime() > lastSeen).length;

  function toggleBell() {
    setBellOpen((v) => {
      const next = !v;
      if (next) {
        const now = Date.now();
        localStorage.setItem(`notif-seen-${user?.id}`, String(now));
        setLastSeen(now);
      }
      return next;
    });
  }

  // ---- Mail: HR approvals inbox / employee pending-requests tracker ----
  const [mailOpen, setMailOpen] = useState(false);
  const mailRef = useRef(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingSick, setPendingSick] = useState([]);
  const [decidingId, setDecidingId] = useState(null);
  const [mailError, setMailError] = useState("");

  const loadMailSources = useCallback(() => {
    if (isHR) {
      api.get("/leaves", { params: { status: "PENDING" } }).then((res) => setPendingLeaves(res.data)).catch(() => {});
      api.get("/sick-leaves", { params: { status: "PENDING" } }).then((res) => setPendingSick(res.data)).catch(() => {});
    } else {
      api.get("/leaves/me").then((res) => setPendingLeaves(res.data.filter((l) => l.status === "PENDING"))).catch(() => {});
      api.get("/sick-leaves/me").then((res) => setPendingSick(res.data.filter((s) => s.status === "PENDING"))).catch(() => {});
    }
  }, [isHR]);

  useEffect(() => { loadMailSources(); }, [loadMailSources]);

  const mailItems = useMemo(() => {
    const items = [
      ...pendingLeaves.map((l) => ({ id: l.id, kind: "leave", data: l })),
      ...pendingSick.map((s) => ({ id: s.id, kind: "sick", data: s })),
    ];
    return items.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
  }, [pendingLeaves, pendingSick]);

  async function decide(kind, id, status) {
    setMailError("");
    setDecidingId(id);
    try {
      await api.patch(`/${kind === "leave" ? "leaves" : "sick-leaves"}/${id}/decision`, { status });
      loadMailSources();
      loadNotifSources();
    } catch (err) {
      setMailError(getErrorMessage(err, "Could not update this request"));
    } finally {
      setDecidingId(null);
    }
  }

  // ---- Nav search ----
  const navItems = useMemo(() => {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    if (isSuperAdmin) return [{ label: "Companies", path: "/", icon: IconBuilding }];
    const items = [
      { label: "Dashboard", path: "/", icon: IconGrid },
      { label: "Attendance", path: "/attendance", icon: IconClock },
      { label: "Announcements", path: "/announcements", icon: IconMegaphone },
      { label: "Directory", path: "/directory", icon: IconAddressBook },
      { label: "Onboarding", path: "/onboarding", icon: IconChecklist },
      { label: "Leaves", path: "/leaves", icon: IconCalendarOff },
      { label: "Sick Leaves", path: "/sick-leaves", icon: IconThermometer },
      { label: "Appraisals", path: "/appraisals", icon: IconStar },
      { label: "My Profile", path: "/profile", icon: IconUser },
    ];
    if (isHR) items.splice(8, 0, { label: "Employees", path: "/employees", icon: IconUsers });
    return items;
  }, [isHR, user?.role]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return navItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, navItems]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    function onClickAway(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setQuery("");
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (mailRef.current && !mailRef.current.contains(e.target)) setMailOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function goTo(path) {
    navigate(path);
    setQuery("");
    inputRef.current?.blur();
  }

  function onSearchKeyDown(e) {
    if (e.key === "Escape") { setQuery(""); inputRef.current?.blur(); return; }
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); goTo(results[activeIdx].path); }
  }

  return (
    <div className="topbar">
      <div className="glow-search topbar-glow-search" ref={searchRef}>
        <label className="glow-search-inner">
          <IconSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            autoComplete="off"
          />
          <kbd>⌘K</kbd>
        </label>
        {results.length > 0 && (
          <div className="search-results search-results-down">
            {results.map((r, i) => (
              <button
                type="button"
                key={r.path}
                className={`search-result ${i === activeIdx ? "active" : ""}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => goTo(r.path)}
              >
                <r.icon /><span>{r.label}</span>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && (
          <div className="search-results search-results-down">
            <p className="search-empty">No matches for "{query}"</p>
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <span className="topbar-date">{today}</span>

        {/* Mail: approvals inbox (HR) / pending requests (employee) */}
        <div className="user-menu" ref={mailRef}>
          <button type="button" className="icon-btn" aria-label="Approvals" onClick={() => setMailOpen((v) => !v)}>
            <IconMail />
            {mailItems.length > 0 && <span className="icon-badge">{mailItems.length}</span>}
          </button>
          {mailOpen && (
            <div className="user-dropdown user-dropdown-down panel-dropdown">
              <p className="panel-heading">{isHR ? "Approvals inbox" : "Your pending requests"}</p>
              {mailError && <p className="error-text" style={{ padding: "0 4px" }}>{mailError}</p>}
              {mailItems.length === 0 && <p className="panel-empty">Nothing waiting on you 🎉</p>}
              {mailItems.map((item) => (
                <div className="panel-item" key={`${item.kind}-${item.id}`}>
                  <div className="panel-item-main">
                    <p className="panel-item-title">
                      {isHR
                        ? `${item.data.user.firstName} ${item.data.user.lastName}`
                        : item.kind === "leave" ? `${item.data.type} leave` : "Sick leave"}
                    </p>
                    <p className="panel-item-sub">
                      {isHR && (item.kind === "leave" ? `${item.data.type} leave · ` : "Sick leave · ")}
                      {new Date(item.data.startDate).toLocaleDateString()} → {new Date(item.data.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  {isHR ? (
                    <div className="panel-item-actions">
                      <button
                        type="button"
                        className="icon-btn approve"
                        aria-label="Approve"
                        disabled={decidingId === item.id}
                        onClick={() => decide(item.kind, item.id, "APPROVED")}
                      ><IconCheck /></button>
                      <button
                        type="button"
                        className="icon-btn reject"
                        aria-label="Reject"
                        disabled={decidingId === item.id}
                        onClick={() => decide(item.kind, item.id, "REJECTED")}
                      ><IconX /></button>
                    </div>
                  ) : (
                    <span className="badge PENDING">Pending</span>
                  )}
                </div>
              ))}
              <NavLink to={isHR ? "/leaves" : "/leaves"} className="panel-viewall" onClick={() => setMailOpen(false)}>
                View all requests
              </NavLink>
            </div>
          )}
        </div>

        {/* Bell: notifications */}
        <div className="user-menu" ref={bellRef}>
          <button type="button" className="icon-btn" aria-label="Notifications" onClick={toggleBell}>
            <IconBell />
            {unseenCount > 0 && <span className="icon-badge">{unseenCount}</span>}
          </button>
          {bellOpen && (
            <div className="user-dropdown user-dropdown-down panel-dropdown">
              <p className="panel-heading">Notifications</p>
              {notifications.length === 0 && <p className="panel-empty">You're all caught up.</p>}
              {notifications.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className="panel-item panel-item-clickable"
                  onClick={() => { setBellOpen(false); navigate(n.path); }}
                >
                  <span className={`panel-dot ${n.status === "APPROVED" ? "success" : n.status === "REJECTED" ? "danger" : "info"}`} />
                  <div className="panel-item-main">
                    <p className="panel-item-title">{n.title}</p>
                    <p className="panel-item-sub">{n.subtitle}</p>
                  </div>
                  <span className="panel-item-time">{timeAgo(n.date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="user-menu topbar-user-menu" ref={menuRef}>
          <button type="button" className="user-menu-trigger" onClick={() => setMenuOpen((v) => !v)}>
            <span className="avatar-chip">{initials || "?"}</span>
            <IconChevronDown className={`user-menu-caret ${menuOpen ? "open" : ""}`} />
          </button>
          {menuOpen && (
            <div className="user-dropdown user-dropdown-down">
              <div className="dropdown-userinfo">
                <span className="sidebar-user-name">{user?.firstName} {user?.lastName}</span>
                <span className="role-tag">{user?.role}</span>
              </div>
              <NavLink to="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <IconUser /><span>My Profile</span>
              </NavLink>
              <button type="button" className="dropdown-item danger" onClick={logout}>
                <IconLogout /><span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
