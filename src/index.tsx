
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

// --- LOGGER GLOBAL ERREURS NON CATCHÉES → Firestore generation_errors ---
// Capture toute erreur JS sync OU Promise rejection non-catchée.
// Best-effort : si Firestore plante, on log juste en console.
async function logGlobalError(source: string, error: any, extra: Record<string, any> = {}) {
  try {
    const auth = (await import('./services/firebase')).auth;
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./services/firebase');
    const u = auth.currentUser;
    await addDoc(collection(db, 'generation_errors'), {
      source,
      userId: u?.uid || null,
      userEmail: u?.email || null,
      errorMessage: String(error?.message || error || 'unknown'),
      errorName: String(error?.name || ''),
      errorStack: String(error?.stack || '').substring(0, 4000),
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent.substring(0, 300),
      url: window.location.href.substring(0, 300),
      ...extra,
    });
  } catch (e) {
    console.warn('[Global Error Logger] Échec log Firestore:', e);
  }
}

window.addEventListener('error', (event) => {
  // Ne pas re-logger les erreurs de cache déjà gérées
  if (event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Loading CSS chunk')) return;
  console.error('[Global Error]', event.error || event.message);
  logGlobalError('window.error', event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
  logGlobalError('unhandledrejection', event.reason);
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
