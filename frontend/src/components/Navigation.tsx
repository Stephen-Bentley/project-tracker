import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavigationProps {
  isAdmin: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isAdmin }) => {
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.replace('/login');
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: '#ffffff',
    fontWeight: isActive ? 700 : 500,
    opacity: isActive ? 1 : 0.82,
    textDecoration: 'none',
  });

  return (
    <header style={styles.header}>
      <nav aria-label="Main navigation" style={styles.nav}>
        <NavLink to="/" style={styles.brand}>
          Project Tracker
        </NavLink>

        <div style={styles.links}>
          <NavLink to="/" end style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" style={linkStyle}>
            Projects
          </NavLink>
          <NavLink to="/profile" style={linkStyle}>
            Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/projects" style={linkStyle}>
              Admin
            </NavLink>
          )}
          <button type="button" onClick={logout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#15803d',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
  },
  nav: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    margin: '0 auto',
    maxWidth: 1200,
    minHeight: 60,
    padding: '0 24px',
  },
  brand: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
    textDecoration: 'none',
  },
  links: {
    alignItems: 'center',
    display: 'flex',
    gap: 20,
  },
  logoutButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    borderRadius: 4,
    color: '#ffffff',
    cursor: 'pointer',
    font: 'inherit',
    padding: '6px 10px',
  },
};

export default Navigation;
