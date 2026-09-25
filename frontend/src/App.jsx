import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Leaves from "./pages/Leaves";
import SickLeaves from "./pages/SickLeaves";
import Appraisals from "./pages/Appraisals";
import Employees from "./pages/Employees";
import Companies from "./pages/Companies";
import Attendance from "./pages/Attendance";
import Announcements from "./pages/Announcements";
import Directory from "./pages/Directory";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <div className="main">{children}</div>
      </div>
    </div>
  );
}

// The platform owner (SUPER_ADMIN) lands on the Companies console at "/";
// everyone else (company HR staff/employees) lands on their Dashboard.
function Home() {
  const { user } = useAuth();
  return user?.role === "SUPER_ADMIN" ? <Companies /> : <Dashboard />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>
        } />
        <Route path="/companies" element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}><Layout><Companies /></Layout></ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><Onboarding /></Layout></ProtectedRoute>
        } />
        <Route path="/leaves" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><Leaves /></Layout></ProtectedRoute>
        } />
        <Route path="/sick-leaves" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><SickLeaves /></Layout></ProtectedRoute>
        } />
        <Route path="/appraisals" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><Appraisals /></Layout></ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute roles={["ADMIN", "HR"]}><Layout><Employees /></Layout></ProtectedRoute>
        } />
        <Route path="/attendance" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><Attendance /></Layout></ProtectedRoute>
        } />
        <Route path="/announcements" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><Announcements /></Layout></ProtectedRoute>
        } />
        <Route path="/directory" element={
          <ProtectedRoute roles={["ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><Layout><Directory /></Layout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </>
  );
}
