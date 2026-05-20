import { useCallback, useEffect, useState } from 'react';
import {
  getDeferredInstallPrompt,
  subscribePwaInstall,
  triggerPwaInstall,
} from '../services/pwaInstallStore';

const DISMISS_KEY = 'cas_pwa_install_dismissed';

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function readInstallState() {
  return {
    canInstall: Boolean(getDeferredInstallPrompt()) && !isStandalone(),
    installed: isStandalone(),
  };
}

export function usePwaInstall() {
  const [installState, setInstallState] = useState(readInstallState);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [installing, setInstalling] = useState(false);

  const { canInstall, installed } = installState;
  const isIos = isIosDevice();

  useEffect(() => {
    const sync = () => setInstallState(readInstallState());
    sync();
    return subscribePwaInstall(sync);
  }, []);

  const showIosHint = isIos && !installed;
  const showBanner = !dismissed && !installed;
  const showCard = !installed;

  const install = useCallback(async () => {
    if (!getDeferredInstallPrompt()) return false;
    setInstalling(true);
    try {
      const result = await triggerPwaInstall();
      setInstallState(readInstallState());
      return result.ok;
    } finally {
      setInstalling(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  return {
    canInstall,
    showIosHint,
    showBanner,
    showCard,
    installed,
    installing,
    install,
    dismiss,
    isIos,
  };
}
