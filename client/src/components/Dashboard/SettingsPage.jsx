import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { FiUser, FiShield, FiBell, FiSun, FiVolume2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updatePreferences } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [prefs, setPrefs] = useState(user?.preferences || {
    alertSound: true, voiceAlerts: true, darkMode: false, alertSensitivity: 'medium',
  });

  const handleSave = async () => {
    try {
      await updatePreferences(prefs);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div style={styles.page} className="mobile-page-padding mobile-main mobile-settings-page">
      <h2 style={styles.pageTitle}>Settings</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={styles.section}><FiUser /> Profile</h3>
        <div style={styles.infoRow}>
          <span style={styles.label}>Name</span>
          <span style={styles.value}>{user?.name}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>Email</span>
          <span style={styles.value}>{user?.email}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>Role</span>
          <span style={styles.value}>{user?.role}</span>
        </div>
      </div>

      <div className="card settings-card" style={{ marginBottom: 20 }}>
        <h3 style={styles.section}><FiBell /> Alert Preferences</h3>

        <div className="setting-row" style={styles.settingRow}>
          <div>
            <div style={styles.settingLabel}><FiVolume2 /> Alert Sound</div>
            <div style={styles.settingDesc}>Play audio when risk detected</div>
          </div>
          <span className="setting-control">
            <button
              onClick={() => toggle('alertSound')}
              style={{ ...styles.toggleBtn, background: prefs.alertSound ? '#22c55e' : 'var(--bg-tertiary)' }}
            >
              <div style={{
                ...styles.toggleDot,
                transform: prefs.alertSound ? 'translateX(20px)' : 'translateX(2px)',
              }} />
            </button>
          </span>
        </div>

        <div className="setting-row" style={styles.settingRow}>
          <div>
            <div style={styles.settingLabel}><FiVolume2 /> Voice Alerts</div>
            <div style={styles.settingDesc}>Spoken warnings for high-risk events</div>
          </div>
          <span className="setting-control">
            <button
              onClick={() => toggle('voiceAlerts')}
              style={{ ...styles.toggleBtn, background: prefs.voiceAlerts ? '#22c55e' : 'var(--bg-tertiary)' }}
            >
              <div style={{
                ...styles.toggleDot,
                transform: prefs.voiceAlerts ? 'translateX(20px)' : 'translateX(2px)',
              }} />
            </button>
          </span>
        </div>

        <div className="setting-row" style={styles.settingRow}>
          <div>
            <div style={styles.settingLabel}><FiSun /> Dark Mode</div>
            <div style={styles.settingDesc}>Toggle dark/light theme</div>
          </div>
          <span className="setting-control">
            <button
              onClick={toggleTheme}
              style={{ ...styles.toggleBtn, background: theme === 'dark' ? '#22c55e' : 'var(--bg-tertiary)' }}
            >
              <div style={{
                ...styles.toggleDot,
                transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(2px)',
              }} />
            </button>
          </span>
        </div>

        <div className="setting-row" style={styles.settingRow}>
          <div>
            <div style={styles.settingLabel}><FiShield /> Alert Sensitivity</div>
            <div style={styles.settingDesc}>Controls warning threshold</div>
          </div>
          <span className="setting-control">
            <select
              value={prefs.alertSensitivity}
              onChange={(e) => setPrefs({ ...prefs, alertSensitivity: e.target.value })}
              style={styles.select}
              className="setting-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </span>
        </div>
      </div>

      <button onClick={handleSave} className="btn btn-primary" style={styles.saveBtn}>
        Save Preferences
      </button>
    </div>
  );
}

const styles = {
  page: { padding: 24, maxWidth: 600, margin: '0 auto' },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' },
  section: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16,
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  label: { color: 'var(--text-muted)', fontSize: 14 },
  value: { color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 },
  settingRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid var(--border-color)',
  },
  settingLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' },
  settingDesc: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  toggleBtn: {
    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
    position: 'relative', transition: 'all 0.3s',
  },
  toggleDot: {
    width: 20, height: 20, borderRadius: '50%', background: 'white',
    position: 'absolute', top: 2, transition: 'all 0.3s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  select: {
    padding: '6px 10px', fontSize: 13, borderRadius: 6,
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  },
  saveBtn: {
    width: '100%',
    minHeight: 48,
    padding: '14px 20px',
    fontSize: 16,
    fontWeight: 600,
  },
};
