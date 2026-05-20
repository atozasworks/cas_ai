export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const swUrl = `${process.env.PUBLIC_URL || ''}/sw.js`;

  const doRegister = () => {
    navigator.serviceWorker
      .register(swUrl)
      .catch(() => {
        // Registration can fail in unsupported contexts.
      });
  };

  // `load` may have already fired when React boots — register immediately if so.
  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
    // Also try early so install criteria are met sooner in dev.
    doRegister();
  }
}
