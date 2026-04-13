import { Capacitor } from '@capacitor/core';

// En mode natif (Capacitor), les appels /api doivent pointer vers le backend Cloud Run
// En mode web, le proxy Vite (dev) ou Firebase Hosting (prod) gère le routage
export const API_BASE = (() => {
  try {
    if (Capacitor.isNativePlatform()) {
      return 'https://coachrunningia.fr';
    }
  } catch {
    // Capacitor non disponible = contexte web
  }
  return '';
})();

export const isNative = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

export const apiUrl = (path: string) => `${API_BASE}${path}`;

// Fetch wrapper qui retire le header Origin problématique en contexte Capacitor
// Le backend autorise les requêtes sans origin (ligne 260 de server.js)
export const apiFetch = (path: string, options: RequestInit = {}): Promise<Response> => {
  const url = apiUrl(path);
  if (isNative) {
    // En mode natif, on utilise mode: 'no-cors' n'est pas possible car on lit la réponse
    // On ajoute un header custom pour que le backend puisse identifier l'app mobile
    const headers = new Headers(options.headers);
    headers.set('X-Mobile-App', 'capacitor');
    return fetch(url, { ...options, headers });
  }
  return fetch(url, options);
};
