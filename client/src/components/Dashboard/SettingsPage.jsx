import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { FiUser, FiShield, FiBell, FiSun, FiVolume2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
      <h2 className="settings-page-title">Settings</h2>

      <div className="card settings-card-spacing">
        <div className="settings-profile-header">
          <h3 className="settings-section-title settings-section-title--no-margin"><FiUser /> Profile</h3>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="settings-profile-btn"
            >
              Edit Profile
            </button>
          ) : (
            <div className="settings-profile-actions">
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSubmitting}
                className="settings-profile-btn settings-profile-btn--save"
              >
                {profileSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleProfileCancel}
                disabled={profileSubmitting}
                className="settings-profile-btn"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="settings-info-row">
          <span className="settings-label">Name</span>
          {isEditingProfile ? (
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
              className="settings-profile-input"
            />
          ) : (
            <span className="settings-value">{user?.name}</span>
          )}
        </div>
        <div className="settings-info-row">
          <span className="settings-label">Email</span>
          {isEditingProfile ? (
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              className="settings-profile-input"
            />
          ) : (
            <span className="settings-value">{user?.email}</span>
          )}
        </div>
        <div className="settings-info-row">
          <span className="settings-label">Role</span>
          <span className="settings-value">{user?.role}</span>
        </div>
      </div>

      <div className="card settings-card settings-card-spacing">
        <h3 className="settings-section-title"><FiBell /> Alert Preferences</h3>

        <div className="setting-row settings-setting-row">
          <div>
            <div className="settings-setting-label"><FiVolume2 /> Alert Sound</div>
            <div className="settings-setting-desc">Play audio when risk detected</div>
          </div>
          <span className="setting-control">
            <button
              onClick={() => toggle('alertSound')}
              className={`settings-toggle ${prefs.alertSound ? 'settings-toggle--on' : 'settings-toggle--off'}`}
              aria-pressed={prefs.alertSound}
            >
              <div
                className="settings-toggle-dot"
                style={{ transform: prefs.alertSound ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </span>
        </div>

        <div className="setting-row settings-setting-row">
          <div>
            <div className="settings-setting-label"><FiVolume2 /> Voice Alerts</div>
            <div className="settings-setting-desc">Spoken warnings for high-risk events</div>
          </div>
          <span className="setting-control">
            <button
              onClick={() => toggle('voiceAlerts')}
              className={`settings-toggle ${prefs.voiceAlerts ? 'settings-toggle--on' : 'settings-toggle--off'}`}
              aria-pressed={prefs.voiceAlerts}
            >
              <div
                className="settings-toggle-dot"
                style={{ transform: prefs.voiceAlerts ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </span>
        </div>

        <div className="setting-row settings-setting-row">
          <div>
            <div className="settings-setting-label"><FiSun /> Dark Mode</div>
            <div className="settings-setting-desc">Toggle dark/light theme</div>
          </div>
          <span className="setting-control">
            <button
              onClick={toggleTheme}
              className={`settings-toggle ${theme === 'dark' ? 'settings-toggle--on' : 'settings-toggle--off'}`}
              aria-pressed={theme === 'dark'}
            >
              <div
                className="settings-toggle-dot"
                style={{ transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </span>
        </div>

        <div className="setting-row settings-setting-row">
          <div>
            <div className="settings-setting-label"><FiShield /> Alert Sensitivity</div>
            <div className="settings-setting-desc">Controls warning threshold</div>
          </div>
          <span className="setting-control">
            <select
              value={prefs.alertSensitivity}
              onChange={(e) => setPrefs({ ...prefs, alertSensitivity: e.target.value })}
              className="settings-select setting-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="btn btn-primary settings-save-btn"
        disabled={savingPreferences}
      >
        {savingPreferences ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
