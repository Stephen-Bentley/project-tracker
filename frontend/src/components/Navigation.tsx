import React from 'react';
import { logoutSession } from '../api/session';
import { NavLink } from 'react-router-dom';

interface NavigationProps {
  isAdmin: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isAdmin }) => {
  const logout = async () => {
    await logoutSession();
    window.location.replace('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `site-nav__link${isActive ? ' site-nav__link--active' : ''}`;

  return (
    <header className="site-header">
      <nav aria-label="Main navigation" className="site-nav">
        <NavLink to="/" className="site-nav__brand">
          Project Tracker
        </NavLink>

        <div className="site-nav__links">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={linkClass}>
            Projects
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/projects" className={linkClass}>
              Admin
            </NavLink>
          )}
          <button type="button" onClick={logout} className="site-nav__logout">
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navigation;
