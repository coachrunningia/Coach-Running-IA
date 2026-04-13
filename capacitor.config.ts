import type { CapacitorConfig } from '@capacitor/cli';

// Mode de chargement : 'local' | 'remote' | 'dev'
// - local  : charge le build depuis dist/ (embarqué dans l'app)
// - remote : charge le site en ligne coachrunningia.fr
// - dev    : charge le serveur Vite local (hot reload, npm run dev doit tourner)
const mode: 'local' | 'remote' | 'dev' = 'local';

const config: CapacitorConfig = {
  appId: 'fr.coachrunningia.app',
  appName: 'Coach Running IA',
  webDir: 'dist',
  ios: {
    scheme: 'Coach Running IA',
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f97316',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f97316',
    },
  },
};

// En mode remote ou dev, on ajoute la config serveur
if (mode === 'remote') {
  config.server = { url: 'https://coachrunningia.fr', cleartext: false };
} else if (mode === 'dev') {
  config.server = { url: 'http://localhost:5173', cleartext: true };
}
// En mode local : pas de server → Capacitor charge depuis webDir (dist/)

export default config;
