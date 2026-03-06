import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../hooks/useTheme';
import { FiShield, FiMap, FiBarChart2, FiSettings, FiLogOut, FiSun, FiMoon, FiWifi, FiWifiOff, FiUser, FiChevronDown } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { to: '/', icon: <FiMap />, label: 'Dashboard' },
    { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
  ];

  return (
    <nav className="navbar" style={styles.nav}>
      <div style={styles.left}>
        <Link to="/" style={styles.brand}>
          <FiShield style={{ color: '#3b82f6', fontSize: 24 }} />
          <span style={styles.brandText}>CAS</span>
        </Link>
        <div className="navbar-desktop-links" style={styles.links}>
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
      <div className="navbar-right" style={styles.right}>
        <div style={styles.status}>
          {connected
            ? <><FiWifi style={{ color: '#22c55e' }} /> <span style={{ color: '#22c55e', fontSize: 12 }}>Live</span></>
            : <><FiWifiOff style={{ color: '#ef4444' }} /> <span style={{ color: '#ef4444', fontSize: 12 }}>Offline</span></>
          }
        </div>
        <button onClick={toggleTheme} style={styles.iconBtn} title="Toggle theme">
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>

        {/* Profile Dropdown */}
        <div ref={dropdownRef} style={styles.profileWrapper}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={styles.profileBtn}
            title="Profile"
          >
            <div style={styles.avatar}>
              {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <span className="navbar-user-name" style={styles.profileName}>{user?.name}</span>
            <FiChevronDown style={{
              fontSize: 14, color: 'var(--text-muted)',
              transition: 'transform 0.2s',
              transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {showDropdown && (
            <div style={styles.dropdown}>
              {/* User info */}
              <div style={styles.dropdownHeader}>
                <div style={styles.dropdownAvatar}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
                </div>
                <div>
                  <div style={styles.dropdownName}>{user?.name}</div>
                  <div style={styles.dropdownEmail}>{user?.email}</div>
                </div>
              </div>

              <div style={styles.dropdownDivider} />

              {/* Settings */}
              <button
                onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                style={styles.dropdownItem}
              >
                <FiSettings style={{ fontSize: 16 }} />
                <span>Settings</span>
              </button>

              <div style={styles.dropdownDivider} />

              {/* Logout */}
              <button
                onClick={() => { logout(); setShowDropdown(false); }}
                style={{ ...styles.dropdownItem, color: '#ef4444' }}
              >
                <FiLogOut style={{ fontSize: 16 }} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
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
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  status: { display: 'flex', alignItems: 'center', gap: 4 },
  iconBtn: {
    background: 'none', border: 'none', color: 'var(--text-secondary)',
    fontSize: 18, cursor: 'pointer', padding: 6, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
  profileWrapper: {
    position: 'relative',
  },
  profileBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '4px 10px 4px 4px', borderRadius: 50,
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: 14, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  profileName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
    maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  /* Dropdown */
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    minWidth: 220, background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: 12,
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    padding: '6px 0', zIndex: 200,
    animation: 'fadeSlideDown 0.15s ease',
  },
  dropdownHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px',
  },
  dropdownAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  dropdownName: {
    fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
  },
  dropdownEmail: {
    fontSize: 12, color: 'var(--text-muted)', marginTop: 1,
  },
  dropdownDivider: {
    height: 1, background: 'var(--border-color)', margin: '4px 0',
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 500,
    color: 'var(--text-primary)', background: 'none', border: 'none',
    cursor: 'pointer', transition: 'background 0.15s',
  },
};
