import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectBoard from "./pages/ProjectBoard";
import AdminProjectsPage from "./pages/AdminProjects";
import Navigation from "./components/Navigation";

const App: React.FC = () => {
  // Grab token and role from localStorage
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // 'admin' or 'user'
  const isAuthenticated = !!token;

  return (
    <BrowserRouter>
      {isAuthenticated && <Navigation isAdmin={role === "admin"} />}
      <Routes>
        {/* Login Page */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <Login />}
        />

        {/* Dashboard */}
        <Route
          path="/"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />

        {/* User Projects Page */}
        <Route
          path="/projects"
          element={isAuthenticated ? <Projects /> : <Navigate to="/login" />}
        />

        {/* Project Board (tasks, kanban, etc.) */}
        <Route
          path="/projects/:projectId"
          element={
            isAuthenticated ? <ProjectBoard /> : <Navigate to="/login" />
          }
        />

        {/* Admin Projects Page */}
        {role === "admin" && (
          <Route
            path="/admin/projects"
            element={
              isAuthenticated ? <AdminProjectsPage /> : <Navigate to="/login" />
            }
          />
        )}

        {/* Fallback: redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
