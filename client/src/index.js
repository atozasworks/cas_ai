import './services/pwaInstallStore';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/mobile.css';
import { loadRuntimeConfig } from './services/runtimeConfig';
import { setApiBaseUrl } from './services/api';
import { registerServiceWorker } from './registerServiceWorker';

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
  .finally(() => {
    registerServiceWorker();
    renderApp();
  });
