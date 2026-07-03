import { useCallback, useEffect, useState } from 'react';

let deferredPrompt = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function bindInstallListeners() {
  if (typeof window === 'undefined' || bindInstallListeners.bound) return;
  bindInstallListeners.bound = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

bindInstallListeners.bound = false;

export function isPwaStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

export function canPromptPwaInstall() {
  return Boolean(deferredPrompt) && !isPwaStandalone();
}

export async function promptPwaInstall() {
  if (isPwaStandalone()) {
    return { ok: false, reason: 'installed' };
  }
  if (!deferredPrompt) {
    return { ok: false, reason: 'unavailable' };
  }

  const promptEvent = deferredPrompt;
  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPrompt = null;
    notifyListeners();
    return { ok: true, outcome };
  } catch {
    deferredPrompt = null;
    notifyListeners();
    return { ok: false, reason: 'failed' };
  }
}

export function usePwaInstall() {
  const [, tick] = useState(0);

  useEffect(() => {
    bindInstallListeners();
    const listener = () => tick((value) => value + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const promptInstall = useCallback(() => promptPwaInstall(), []);

  return {
    canInstall: canPromptPwaInstall(),
    isStandalone: isPwaStandalone(),
    promptInstall,
  };
}
