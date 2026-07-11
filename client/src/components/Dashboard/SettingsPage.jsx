import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { FiUser, FiShield, FiBell, FiSun, FiVolume2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, updatePreferences, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefs, setPrefs] = useState(user?.preferences || {
    alertSound: true, voiceAlerts: true, darkMode: false, alertSensitivity: 'medium',
  });

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
    });
    setPrefs(user?.preferences || {
      alertSound: true, voiceAlerts: true, darkMode: false, alertSensitivity: 'medium',
    });
  }, [user]);

  const handleSave = async () => {
    try {
      setSavingPreferences(true);
      await updatePreferences(prefs);
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(err?.message || 'Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleProfileSave = async () => {
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();

    if (name.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setProfileSubmitting(true);
    try {
      await updateProfile({ name, email });
      toast.success('Profile updated');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleProfileCancel = () => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="settings-page mobile-page-padding mobile-main mobile-settings-page">
      <header className="settings-page__header">
        <h2 className="settings-page__title">Settings</h2>
        <p className="settings-page__subtitle">Manage your profile and in-app alert preferences.</p>
      </header>

      <section className="settings-panel card">
        <div className="settings-panel__header">
          <h3 className="settings-section-title">
            <span className="settings-section-title__icon"><FiUser /></span>
            <span>Profile</span>
          </h3>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="settings-btn settings-btn--ghost"
            >
              Edit Profile
            </button>
          ) : (
            <div className="settings-btn-group">
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSubmitting}
                className="settings-btn settings-btn--primary"
              >
                {profileSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleProfileCancel}
                disabled={profileSubmitting}
                className="settings-btn settings-btn--ghost"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="settings-info-list">
          <div className="settings-info-row">
            <span className="settings-label">Name</span>
            <div className="settings-value-wrap">
              {isEditingProfile ? (
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="settings-input"
                />
              ) : (
                <span className="settings-value">{user?.name}</span>
              )}
            </div>
          </div>

          <div className="settings-info-row">
            <span className="settings-label">Email</span>
            <div className="settings-value-wrap">
              {isEditingProfile ? (
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="settings-input"
                />
              ) : (
                <span className="settings-value">{user?.email}</span>
              )}
            </div>
          </div>

          <div className="settings-info-row">
            <span className="settings-label">Role</span>
            <span className="settings-value settings-role-badge">{user?.role}</span>
          </div>
        </div>
      </section>

      <section className="settings-panel card">
        <div className="settings-panel__header">
          <h3 className="settings-section-title">
            <span className="settings-section-title__icon"><FiBell /></span>
            <span>Alert Preferences</span>
          </h3>
        </div>

        <div className="settings-item">
          <div className="settings-item__content">
            <div className="settings-item__title"><FiVolume2 /> Alert Sound</div>
            <div className="settings-item__description">Play audio when risk detected</div>
          </div>
          <button
            type="button"
            onClick={() => toggle('alertSound')}
            className={`settings-toggle ${prefs.alertSound ? 'is-on' : ''}`}
            aria-pressed={prefs.alertSound}
            aria-label="Toggle alert sound"
          >
            <span className="settings-toggle__dot" />
          </button>
        </div>

        <div className="settings-item">
          <div className="settings-item__content">
            <div className="settings-item__title"><FiVolume2 /> Voice Alerts</div>
            <div className="settings-item__description">Spoken warnings for high-risk events</div>
          </div>
          <button
            type="button"
            onClick={() => toggle('voiceAlerts')}
            className={`settings-toggle ${prefs.voiceAlerts ? 'is-on' : ''}`}
            aria-pressed={prefs.voiceAlerts}
            aria-label="Toggle voice alerts"
          >
            <span className="settings-toggle__dot" />
          </button>
        </div>

        <div className="settings-item">
          <div className="settings-item__content">
            <div className="settings-item__title"><FiSun /> Dark Mode</div>
            <div className="settings-item__description">Toggle dark/light theme</div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`settings-toggle ${theme === 'dark' ? 'is-on' : ''}`}
            aria-pressed={theme === 'dark'}
            aria-label="Toggle dark mode"
          >
            <span className="settings-toggle__dot" />
          </button>
        </div>

        <div className="settings-item settings-item--select">
          <div className="settings-item__content">
            <div className="settings-item__title"><FiShield /> Alert Sensitivity</div>
            <div className="settings-item__description">Controls warning threshold</div>
          </div>
          <select
            value={prefs.alertSensitivity}
            onChange={(e) => setPrefs({ ...prefs, alertSensitivity: e.target.value })}
            className="settings-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        className="settings-save-btn"
        disabled={savingPreferences}
      >
        {savingPreferences ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
