import React, { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import './PwaInstallBanner.css';

const DISMISS_KEY = 'cas_pwa_install_dismissed';
const DISMISS_DAYS = 7;
const APP_LOGO = `${process.env.PUBLIC_URL || ''}/images/ucasapp.png`;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const elapsed = Date.now() - dismissedAt;
    return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();

  useEffect(() => {
    if (isStandalone || isDismissed()) return;
    if (canInstall) setVisible(true);
  }, [canInstall, isStandalone]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result.ok && result.outcome === 'accepted') {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
    }
  }, [promptInstall]);

  if (!visible || !canInstall) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install app">
      <div className="pwa-install-banner__card">
        <div className="pwa-install-banner__logo-wrap">
          <img
            src={APP_LOGO}
            alt="UCASAAPP"
            className="pwa-install-banner__logo"
          />
        </div>

        <div className="pwa-install-banner__content">
          <p className="pwa-install-banner__title">Install UCASAAPP</p>
          <p className="pwa-install-banner__desc">
            Install on your home screen for quick access and a full-screen app experience.
          </p>
        </div>

        <div className="pwa-install-banner__actions">
          <button
            type="button"
            className="pwa-install-banner__install-btn"
            onClick={handleInstall}
            disabled={installing}
          >
            <FiDownload className="pwa-install-banner__install-icon" aria-hidden="true" />
            {installing ? 'Installing…' : 'Install App'}
          </button>
          <button
            type="button"
            className="pwa-install-banner__close-btn"
            onClick={dismiss}
            aria-label="Dismiss install banner"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
