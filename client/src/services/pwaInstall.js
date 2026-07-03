let deferredPrompt = null;
let initialized = false;
const listeners = new Set();

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

export function canInstallPwa() {
  return Boolean(deferredPrompt) && !isStandalonePwa();
}

function getSnapshot() {
  return {
    canInstall: canInstallPwa(),
    isStandalone: isStandalonePwa(),
  };
}

function notifyListeners() {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribePwaInstall(listener) {
  listeners.add(listener);
  listener(getSnapshot());
  return () => listeners.delete(listener);
}

export function initPwaInstall() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

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

export async function promptPwaInstall() {
  if (isStandalonePwa()) {
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
    return { ok: false, reason: 'error' };
  }
}

export function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}
