import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wisport.app',
  appName: 'Wisport',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#090A0F',
    preferredContentMode: 'mobile',
    scheme: 'Wisport',
  },
  server: {
    // Pour que le binaire TestFlight communique avec le backend Gemini hébergé :
    // Si vous auto-hébergez l'API, remplacez par votre URL Cloud Run de production.
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
};

export default config;
