import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kuripot.app',
  appName: 'KURIPOT',
  webDir: 'dist',
  // When running on device, load the bundled dist/ folder (offline-first)
  // Remove the server block before building for production/Play Store
  server: {
    // Uncomment below during development to live-reload from your dev server
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_kuripot',
      iconColor: '#285ccc',
      sound: 'kaching.ogg',
      // Our channel kuripot_reminders is pre-created in MainActivity.kt
      // with IMPORTANCE_HIGH for floating heads-up banners
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f1729',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
