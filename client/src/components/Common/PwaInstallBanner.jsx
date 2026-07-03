import React, { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import './PwaInstallBanner.css';

const DISMISS_KEY = 'cas_pwa_install_dismissed';
const DISMISS_DAYS = 7;
const APP_ICON = `${process.env.PUBLIC_URL || ''}/icons/icon-192.png`;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isStandalone() || isDismissed()) return undefined;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
    } catch {
      /* user cancelled or prompt failed */
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }, [deferredPrompt]);

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install app">
      <div className="pwa-install-banner__card">
        <div className="pwa-install-banner__logo-wrap">
          <img
            src={APP_ICON}
            alt=""
            className="pwa-install-banner__logo"
            width={48}
            height={48}
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
