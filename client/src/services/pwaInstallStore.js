/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function init() {
  if (typeof window === 'undefined' || window.__casPwaStoreInit) return;
  window.__casPwaStoreInit = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

init();

export function subscribePwaInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
  notify();
}

export async function triggerPwaInstall() {
  const prompt = deferredPrompt;
  if (!prompt) {
    return { ok: false, reason: 'unavailable' };
  }

  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      notify();
      return { ok: true };
    }
    return { ok: false, reason: 'dismissed' };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}
