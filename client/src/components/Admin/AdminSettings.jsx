import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/adminApi';

const DEFAULTS = {
  riskThresholds: {
    high: 70,
    medium: 40,
    criticalDistanceMeters: 20,
    criticalTtcSeconds: 3,
  },
  alertSettings: {
    autoEscalateSeconds: 30,
    highRiskNotify: true,
    nearMissNotify: true,
    collisionNotify: true,
  },
  notificationSettings: {
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
    digestFrequency: 'realtime',
  },
};

export default function AdminSettings() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.getSettings()
      .then((res) => {
        setForm({
          riskThresholds: { ...DEFAULTS.riskThresholds, ...res.settings?.riskThresholds },
          alertSettings: { ...DEFAULTS.alertSettings, ...res.settings?.alertSettings },
          notificationSettings: { ...DEFAULTS.notificationSettings, ...res.settings?.notificationSettings },
        });
      })
      .catch((err) => toast.error(err?.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateSection = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(form);
      toast.success('Admin settings saved');
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <section className="admin-card">
        <div className="admin-card-body">
          <h2>Risk Threshold Settings</h2>
          <p>Control when events are classified as medium or high risk.</p>
          <div className="admin-settings-grid">
            <NumberField label="High risk score" value={form.riskThresholds.high} onChange={(v) => updateSection('riskThresholds', 'high', v)} />
            <NumberField label="Medium risk score" value={form.riskThresholds.medium} onChange={(v) => updateSection('riskThresholds', 'medium', v)} />
            <NumberField label="Critical distance (m)" value={form.riskThresholds.criticalDistanceMeters} onChange={(v) => updateSection('riskThresholds', 'criticalDistanceMeters', v)} />
            <NumberField label="Critical TTC (seconds)" value={form.riskThresholds.criticalTtcSeconds} onChange={(v) => updateSection('riskThresholds', 'criticalTtcSeconds', v)} />
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-body">
          <h2>Alert Settings</h2>
          <p>Escalation timing and which event types should trigger alerts.</p>
          <div className="admin-settings-grid">
            <NumberField label="Auto-escalate after (seconds)" value={form.alertSettings.autoEscalateSeconds} onChange={(v) => updateSection('alertSettings', 'autoEscalateSeconds', v)} />
            <ToggleField label="Notify on high risk" checked={form.alertSettings.highRiskNotify} onChange={(v) => updateSection('alertSettings', 'highRiskNotify', v)} />
            <ToggleField label="Notify on near miss" checked={form.alertSettings.nearMissNotify} onChange={(v) => updateSection('alertSettings', 'nearMissNotify', v)} />
            <ToggleField label="Notify on collision" checked={form.alertSettings.collisionNotify} onChange={(v) => updateSection('alertSettings', 'collisionNotify', v)} />
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-body">
          <h2>Notification Settings</h2>
          <p>Choose how admins and operators receive alert notifications.</p>
          <div className="admin-settings-grid">
            <ToggleField label="Email alerts" checked={form.notificationSettings.emailAlerts} onChange={(v) => updateSection('notificationSettings', 'emailAlerts', v)} />
            <ToggleField label="SMS alerts" checked={form.notificationSettings.smsAlerts} onChange={(v) => updateSection('notificationSettings', 'smsAlerts', v)} />
            <ToggleField label="Push alerts" checked={form.notificationSettings.pushAlerts} onChange={(v) => updateSection('notificationSettings', 'pushAlerts', v)} />
            <label className="admin-field-label">
              Digest frequency
              <select
                value={form.notificationSettings.digestFrequency}
                onChange={(e) => updateSection('notificationSettings', 'digestFrequency', e.target.value)}
              >
                <option value="realtime">Realtime</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="admin-save-row">
        <button type="button" onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="admin-field-label">
      {label}
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="admin-toggle">
      {label}
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
