import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role'); // 'admin' or 'user'

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.replace('/login');
  };

  const goToProjects = () => {
    navigate('/projects');
  };

  const goToAdmin = () => {
    navigate('/admin/projects');
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <p>Workspace overview</p>
        <h1>Ready to make progress?</h1>
        <span>
          Pick up where you left off, move a task forward, or set up your next
          project.
        </span>
      </section>
      <section className="dashboard-actions">
        <button
          onClick={goToProjects}
          className="dashboard-action dashboard-action--primary"
        >
          <strong>My projects</strong>
          <span>Open your boards and keep work moving.</span>
        </button>

        {role === 'admin' && (
          <button onClick={goToAdmin} className="dashboard-action">
            <strong>Admin tools</strong>
            <span>Create users and start a new project.</span>
          </button>
        )}

        <button
          onClick={logout}
          className="dashboard-action dashboard-action--danger"
        >
          <strong>Log out</strong>
          <span>End this session on this device.</span>
        </button>
      </section>
    </main>
  );
};

export default Dashboard;
