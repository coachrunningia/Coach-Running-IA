
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// --- SÉCURITÉ : DÉSACTIVATION SERVICE WORKER ---
// Si un Service Worker traîne d'une ancienne version, on le tue pour éviter les problèmes de cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service Worker nettoyé/désactivé.');
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { SettingsProvider } from './context/SettingsContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode><HelmetProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </HelmetProvider></React.StrictMode>
);
