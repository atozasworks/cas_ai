import React from 'react';
import { FiDownload, FiSmartphone, FiX } from 'react-icons/fi';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import toast from 'react-hot-toast';

const styles = {
  banner: {
    position: 'fixed',
    bottom: 72,
    left: 12,
    right: 12,
    zIndex: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    maxWidth: 480,
    margin: '0 auto',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#f8fafc',
  },
  bannerText: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  bannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  installBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dismissBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  card: {
    marginBottom: 20,
  },
  cardInner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    color: '#60a5fa',
    flexShrink: 0,
    marginTop: 2,
  },
  cardTitle: {
    margin: '0 0 6px',
    fontSize: 15,
    fontWeight: 600,
  },
  cardText: {
    margin: '0 0 12px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
};

export default function InstallAppPrompt({ variant = 'banner', bottom = 72 }) {
  const {
    canInstall, showIosHint, showBanner, showCard, installed, installing, install, dismiss, isIos,
  } = usePwaInstall();

  if (installed) return null;
  if (variant === 'card' && !showCard) return null;
  if (variant !== 'card' && !showBanner) return null;

  const handleInstall = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canInstall) {
      toast('Use browser menu (⋮) → Install app', { icon: 'ℹ️' });
      return;
    }
    const ok = await install();
    if (ok) {
      toast.success('App installed successfully!');
    } else if (canInstall) {
      toast.error('Install was cancelled');
    } else {
      toast.error('Install is not available right now. Try browser menu → Install app.');
    }
  };

  const iosSteps = 'Tap Share → Add to Home Screen';

  if (variant === 'card') {
    return (
      <div className="card" style={styles.card}>
        <div style={styles.cardInner}>
          <FiSmartphone size={22} style={styles.cardIcon} />
          <div style={{ flex: 1 }}>
            <h3 style={styles.cardTitle}>Install UCASAAPP</h3>
            <p style={styles.cardText}>
              {canInstall
                ? 'Install this app on your device for quick access and a full-screen experience.'
                : isIos
                  ? `On iPhone/iPad: ${iosSteps}`
                  : 'Use your browser menu (⋮) and choose Install app or Add to Home screen.'}
            </p>
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              style={styles.installBtn}
            >
              <FiDownload size={16} />
              {installing ? 'Installing…' : 'Install App'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.banner, bottom }} role="region" aria-label="Install app">
      <div style={styles.bannerContent}>
        <FiSmartphone size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={styles.bannerTitle}>Install UCASAAPP</p>
          <p style={styles.bannerText}>
            {canInstall
              ? 'Add to your home screen for faster access.'
              : showIosHint
                ? iosSteps
                : 'Use browser menu to install this app.'}
          </p>
        </div>
      </div>
      <div style={styles.bannerActions}>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          style={styles.installBtn}
        >
          <FiDownload size={14} />
          {installing ? 'Installing…' : 'Install'}
        </button>
        <button type="button" onClick={dismiss} style={styles.dismissBtn} aria-label="Dismiss">
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}
