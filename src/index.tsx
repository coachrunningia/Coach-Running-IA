
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Capacitor } from '@capacitor/core';

// Marquer le HTML comme Capacitor pour les overrides CSS mobiles
try {
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add('capacitor');
  }
} catch {}


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

// --- AUTO-REFRESH SUR ERREUR DE CACHE APRÈS DÉPLOIEMENT ---
// Quand un déploiement change les hash des fichiers JS, les imports dynamiques échouent.
// On détecte ça et on force un refresh automatique (1 seule fois pour éviter une boucle).
window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem('lastCacheReload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload) > 10000) {
    sessionStorage.setItem('lastCacheReload', now.toString());
    window.location.reload();
  }
});

// Fallback pour les erreurs de chargement de module non captées par Vite
window.addEventListener('error', (event) => {
  if (event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Loading CSS chunk')) {
    const lastReload = sessionStorage.getItem('lastCacheReload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem('lastCacheReload', now.toString());
      window.location.reload();
    }
  }
});

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
