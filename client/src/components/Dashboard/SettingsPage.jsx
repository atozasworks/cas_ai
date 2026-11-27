import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../hooks/useTheme';
import { normalizePhone } from '../../services/sos';
import { FiUser, FiShield, FiBell, FiSun, FiMoon, FiVolume2, FiPhone, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, updatePreferences, updateProfile, addEmergencyContact, removeEmergencyContact } = useAuth();
  const { sendTestSos } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: 'family' });
  const [savingContact, setSavingContact] = useState(false);
  const [testingSos, setTestingSos] = useState(false);
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

  const handleAddContact = async (event) => {
    event.preventDefault();
    const name = contactForm.name.trim();
    const phone = normalizePhone(contactForm.phone);
    if (name.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    if (!phone) {
      toast.error('Enter a valid mobile number');
      return;
    }
    setSavingContact(true);
    try {
      await addEmergencyContact({
        name,
        phone,
        relationship: contactForm.relationship,
      });
      setContactForm({ name: '', phone: '', relationship: 'family' });
      toast.success('Emergency contact saved');
    } catch (err) {
      toast.error(err?.message || 'Could not save that contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleRemoveContact = async (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    try {
      await removeEmergencyContact(digits);
      toast.success('Contact removed');
    } catch (err) {
      toast.error(err?.message || 'Could not remove that contact');
    }
  };

  const handleTestSos = async () => {
    setTestingSos(true);
    try {
      const result = await sendTestSos();
      if (result?.ok) {
        toast.success('Test SOS started. Nothing is sent until you tap.');
        return;
      }
      const reasons = {
        contacts: 'Add an emergency contact first',
        vehicle: 'Add a vehicle on Home first',
        gps: 'Allow location, then try the test again',
        socket: 'The app is not connected. Check that the server is running.',
        auth: 'Sign in again, then retry',
      };
      toast.error(reasons[result?.reason] || 'Could not start the test SOS');
    } finally {
      setTestingSos(false);
    }
  };

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
        <p className="settings-page__subtitle">Manage your profile, emergency contacts, and alert preferences.</p>
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
            <span className="settings-section-title__icon"><FiPhone /></span>
            <span>Emergency contacts</span>
          </h3>
        </div>
        <p className="settings-item__description settings-contacts-note">
          These people receive your location only after you tap Text, WhatsApp, or Share on the SOS screen. Automatic crash detection runs while Track is on.
        </p>

        {(user?.emergencyContacts || []).length > 0 && (
          <ul className="settings-contact-list">
            {user.emergencyContacts.map((contact) => (
              <li key={contact.phone} className="settings-contact-row">
                <div>
                  <div className="settings-contact-name">{contact.name}</div>
                  <div className="settings-contact-meta">{contact.relationship} · {contact.phone}</div>
                </div>
                <button
                  type="button"
                  className="settings-btn settings-btn--ghost"
                  onClick={() => handleRemoveContact(contact.phone)}
                  aria-label={`Remove ${contact.name}`}
                >
                  <FiTrash2 />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="settings-contact-form" onSubmit={handleAddContact}>
          <input
            type="text"
            className="settings-input"
            placeholder="Name"
            value={contactForm.name}
            onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="tel"
            className="settings-input"
            placeholder="Mobile number"
            value={contactForm.phone}
            onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <select
            className="settings-select"
            value={contactForm.relationship}
            onChange={(e) => setContactForm((prev) => ({ ...prev, relationship: e.target.value }))}
            aria-label="Relationship"
          >
            <option value="family">Family</option>
            <option value="friend">Friend</option>
            <option value="coworker">Coworker</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="settings-btn settings-btn--primary" disabled={savingContact}>
            {savingContact ? 'Saving...' : 'Add contact'}
          </button>
        </form>

        <button
          type="button"
          className="settings-btn settings-btn--ghost settings-test-sos"
          onClick={handleTestSos}
          disabled={testingSos}
        >
          {testingSos ? 'Starting test...' : 'Test SOS alert'}
        </button>
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
            <div className="settings-item__title">
              {theme === 'dark'
                ? <FiMoon style={{ color: '#818cf8', filter: 'drop-shadow(0 0 5px rgba(129, 140, 248, 0.45))' }} />
                : <FiSun style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))' }} />}
              {' '}Dark Mode
            </div>
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
