import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiMapPin, FiAlertCircle, FiUser } from 'react-icons/fi';
import { useIsMobile } from '../../hooks/useIsMobile';

const tabs = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/track', icon: FiMapPin, label: 'Track' },
  { to: '/analytics', icon: FiAlertCircle, label: 'Alerts' },
  { to: '/settings', icon: FiUser, label: 'Profile' },
];

export default function BottomNav() {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span className="nav-icon" aria-hidden="true">
            <Icon />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
