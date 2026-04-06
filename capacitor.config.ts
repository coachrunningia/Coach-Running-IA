import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.coachrunningia.app',
  appName: 'Coach Running IA',
  webDir: 'dist',
  server: {
    // En production : charger le site web déployé (pas les fichiers locaux)
    // Cela garantit que l'app a toujours la dernière version
    url: 'https://coachrunningia.fr',
    cleartext: false,
  },
  ios: {
    scheme: 'Coach Running IA',
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
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

export default config;
