import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconGrid, IconClock, IconMegaphone, IconUsers, IconChecklist,
  IconCalendarOff, IconThermometer, IconStar, IconBuilding, IconAddressBook,
} from "./icons";

export default function Sidebar() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">E</span>
        <span className="brand-name">{isSuperAdmin ? "Eazi HR · Admin" : "Eazi HR"}</span>
      </div>

      {isSuperAdmin ? (
        <div className="nav-group">
          <p className="nav-group-label">Main menu</p>
          <NavLink to="/" end className="nav-link"><IconBuilding /><span>Companies</span></NavLink>
        </div>
      ) : (
        <>
          <div className="nav-group">
            <p className="nav-group-label">Main menu</p>
            <NavLink to="/" end className="nav-link"><IconGrid /><span>Dashboard</span></NavLink>
            <NavLink to="/attendance" className="nav-link"><IconClock /><span>Attendance</span></NavLink>
            <NavLink to="/announcements" className="nav-link"><IconMegaphone /><span>Announcements</span></NavLink>
            <NavLink to="/directory" className="nav-link"><IconAddressBook /><span>Directory</span></NavLink>
          </div>

          <div className="nav-group">
            <p className="nav-group-label">Features</p>
            <NavLink to="/onboarding" className="nav-link"><IconChecklist /><span>Onboarding</span></NavLink>
            <NavLink to="/leaves" className="nav-link"><IconCalendarOff /><span>Leaves</span></NavLink>
            <NavLink to="/sick-leaves" className="nav-link"><IconThermometer /><span>Sick Leaves</span></NavLink>
            <NavLink to="/appraisals" className="nav-link"><IconStar /><span>Appraisals</span></NavLink>
            {isHR && <NavLink to="/employees" className="nav-link"><IconUsers /><span>Employees</span></NavLink>}
          </div>
        </>
      )}

      <div className="sidebar-spacer" />
    </div>
  );
}
