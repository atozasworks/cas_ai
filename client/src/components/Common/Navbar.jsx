import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../hooks/useTheme';
import { FiShield, FiMap, FiBarChart2, FiSettings, FiLogOut, FiSun, FiMoon, FiWifi, FiWifiOff } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: <FiMap />, label: 'Dashboard' },
    { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    { to: '/settings', icon: <FiSettings />, label: 'Settings' },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link to="/" style={styles.brand}>
          <FiShield style={{ color: '#3b82f6', fontSize: 24 }} />
          <span style={styles.brandText}>CAS</span>
        </Link>
        <div style={styles.links}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                ...styles.link,
                ...(location.pathname === item.to ? styles.activeLink : {}),
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.status}>
          {connected
            ? <><FiWifi style={{ color: '#22c55e' }} /> <span style={{ color: '#22c55e', fontSize: 12 }}>Live</span></>
            : <><FiWifiOff style={{ color: '#ef4444' }} /> <span style={{ color: '#ef4444', fontSize: 12 }}>Offline</span></>
          }
        </div>
        <button onClick={toggleTheme} style={styles.iconBtn} title="Toggle theme">
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
        <span style={styles.userName}>{user?.name}</span>
        <button onClick={logout} style={styles.iconBtn} title="Logout">
          <FiLogOut />
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 56,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  left: { display: 'flex', alignItems: 'center', gap: 32 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  brandText: { fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: 1 },
  links: { display: 'flex', gap: 4 },
  link: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 8, color: 'var(--text-secondary)', textDecoration: 'none',
    fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
  },
  activeLink: {
    background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
  },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
  status: { display: 'flex', alignItems: 'center', gap: 4 },
  userName: { fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 },
  iconBtn: {
    background: 'none', border: 'none', color: 'var(--text-secondary)',
    fontSize: 18, cursor: 'pointer', padding: 6, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
};
