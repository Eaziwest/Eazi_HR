import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  function handleLogout() {
    logout();
  }

  return (
    <div className="sidebar">
      <h2>{isSuperAdmin ? "Eazi HR · Admin" : "Eazi HR"}</h2>

      {isSuperAdmin ? (
        <NavLink to="/" end>Companies</NavLink>
      ) : (
        <>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/attendance">Attendance</NavLink>
          <NavLink to="/announcements">Announcements</NavLink>
          <NavLink to="/directory">Directory</NavLink>
          <NavLink to="/onboarding">Onboarding</NavLink>
          <NavLink to="/leaves">Leaves</NavLink>
          <NavLink to="/sick-leaves">Sick Leaves</NavLink>
          <NavLink to="/appraisals">Appraisals</NavLink>
          {isHR && <NavLink to="/employees">Employees</NavLink>}
        </>
      )}
      <NavLink to="/profile">My Profile</NavLink>

      <div className="sidebar-footer">
        <p className="sidebar-user">
          {user?.firstName} {user?.lastName}
          <span className="role-tag">{user?.role}</span>
        </p>
        <button type="button" className="logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );
}
