import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import './ThemeToggle.css';

/**
 * Animated sun/moon theme switch.
 * Shows the icon of the mode you will switch TO:
 * dark theme -> sun (click for light), light theme -> moon (click for dark).
 */
export default function ThemeToggle({ theme, onToggle, className = '' }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'theme-toggle--dark' : 'theme-toggle--light'} ${className}`.trim()}
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="theme-toggle__halo" aria-hidden="true" />
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        <FiSun />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        <FiMoon />
      </span>
      <span className="theme-toggle__stars" aria-hidden="true">
        <i /><i /><i />
      </span>
    </button>
  );
}
