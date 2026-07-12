import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectBoard from './pages/ProjectBoard';
import AdminProjectsPage from './pages/AdminProjects';
import Navigation from './components/Navigation';
import Profile from './pages/Profile';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );
  // Grab token and role from localStorage
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role'); // 'admin' or 'user'
  const isAuthenticated = !!token;

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <BrowserRouter>
      {isAuthenticated && <Navigation isAdmin={role === 'admin'} />}
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

        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Profile darkMode={darkMode} onThemeChange={setDarkMode} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Admin Projects Page */}
        {role === 'admin' && (
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
