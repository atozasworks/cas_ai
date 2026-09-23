import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPhone,
  FiSettings,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../Common/ThemeToggle';

const navItems = [
  { to: '/home/admin/panel', icon: FiGrid, label: 'Dashboard' },
  { to: '/home/admin/users', icon: FiUsers, label: 'Users' },
  { to: '/home/admin/alerts', icon: FiAlertTriangle, label: 'Accident Alerts' },
  { to: '/home/admin/emergency-contacts', icon: FiPhone, label: 'Emergency Contacts' },
  { to: '/home/admin/settings', icon: FiSettings, label: 'Settings' },
];

const pageTitles = {
  '/home/admin/panel': 'Dashboard',
  '/home/admin/users': 'Users',
  '/home/admin/alerts': 'Accident Alerts',
  '/home/admin/emergency-contacts': 'Emergency Contacts',
  '/home/admin/settings': 'Settings',
};

export default function AdminLayout() {
  const { adminUser, logout } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/home/admin/login', { replace: true });
  };

  const avatarInitial = adminUser?.name?.charAt(0)?.toUpperCase() || 'A';
  const title = pageTitles[location.pathname] || 'Admin Panel';

  return (
    <div className="admin-panel">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="admin-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="admin-sidebar-close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <FiX size={18} />
        </button>

        <div className="admin-brand">
          <div className="admin-brand-mark">
            <FiActivity size={20} />
          </div>
          <div>
            <div className="admin-brand-name">UCASAAPP</div>
            <div className="admin-brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" onClick={handleLogout} className="admin-logout">
            <FiLogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu size={18} />
            </button>
            <div>
              <h1>{title}</h1>
              <p className="admin-header-sub">Collision avoidance operations</p>
            </div>
          </div>

          <div className="admin-header-right">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <div className="admin-profile">
              <div className="admin-avatar">{avatarInitial}</div>
              <div className="admin-profile-meta">
                <div className="admin-profile-name">{adminUser?.name || adminUser?.username}</div>
                <div className="admin-profile-role">admin</div>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
