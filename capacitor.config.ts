import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor-Konfiguration für die spätere native iPhone-App.
 * Der Web-Build (dist/) wird unverändert in die App eingebettet; "https" als Schema ist nötig,
 * damit Mikrofon (getUserMedia) und Service Worker im WKWebView als sicherer Kontext gelten.
 */
const config: CapacitorConfig = {
  appId: 'de.guitarcoach.app',
  appName: 'GuitarCoach',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#161618',
    preferredContentMode: 'mobile',
  },
};

export default config;
