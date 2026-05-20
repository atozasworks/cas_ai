import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/mobile.css';
import { loadRuntimeConfig } from './services/runtimeConfig';
import { setApiBaseUrl } from './services/api';

async function disablePwa() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

loadRuntimeConfig()
  .then((cfg) => setApiBaseUrl(cfg.apiUrl))
  .then(() => disablePwa())
  .finally(() => {
    renderApp();
  });
