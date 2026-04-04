import React, { useEffect, useState } from 'react';
import './InstallPWA.css';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(isInStandaloneMode);

    // Listen for beforeinstallprompt event (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Store dismissal to prevent showing too frequently
    localStorage.setItem('pwa-install-dismissed', Date.now());
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // iOS install instructions
  if (isIOS && !isStandalone) {
    return (
      <div className="install-pwa-banner ios">
        <div className="install-content">
          <div className="install-icon">📱</div>
          <div className="install-text">
            <strong>Install UCASAAPP</strong>
            <p>
              Tap the <strong>Share</strong> button 
              <span className="ios-share-icon">⎙</span> below and select 
              <strong>"Add to Home Screen"</strong>
            </p>
          </div>
          <button className="dismiss-btn" onClick={handleDismiss}>✕</button>
        </div>
      </div>
    );
  }

  // Chrome/Edge/Android install prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="install-pwa-banner">
        <div className="install-content">
          <div className="install-icon">
            <img src="/logo192.png" alt="UCASAAPP" />
          </div>
          <div className="install-text">
            <strong>Install UCASAAPP</strong>
            <p>Get quick access and work offline</p>
          </div>
          <div className="install-actions">
            <button className="install-btn" onClick={handleInstallClick}>
              Install
            </button>
            <button className="dismiss-btn" onClick={handleDismiss}>
              Not Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPWA;

