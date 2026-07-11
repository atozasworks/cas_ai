import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/mobile.css';
import { loadRuntimeConfig } from './services/runtimeConfig';
import { setApiBaseUrl } from './services/api';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
const PROD_APP_ORIGIN = String(process.env.REACT_APP_PROD_APP_ORIGIN || 'https://www.ucasaapp.com').trim().replace(/\/+$/, '');

const isLocalRuntimeOrigin = () => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
};

const maybeRedirectToProductionOrigin = () => {
  if (process.env.NODE_ENV !== 'production') return false;
  if (!isLocalRuntimeOrigin()) return false;
  if (!PROD_APP_ORIGIN) return false;

  const target = `${PROD_APP_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
  return true;
};

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (!maybeRedirectToProductionOrigin()) {
  loadRuntimeConfig()
    .then((cfg) => setApiBaseUrl(cfg.apiUrl))
    .finally(() => {
      renderApp();
      serviceWorkerRegistration.register();
    });
}
