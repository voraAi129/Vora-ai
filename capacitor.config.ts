import type { CapacitorConfig } from '@capacitor/cli';

// ============================================================
// VORA EARNING — Capacitor Configuration (Play Store Safe)
//
// How it works:
//   - Frontend React app is BUNDLED inside the APK (no remote loading)
//   - Only API calls go to Railway server via VITE_API_URL
//   - This complies with Google Play Store policies
//
// Before building APK for Play Store:
//   1. Set VITE_API_URL=https://your-app.up.railway.app in .env
//   2. Run: npm run build
//   3. Run: npx cap sync android
//   4. Build signed AAB in Android Studio
// ============================================================

const config: CapacitorConfig = {
  appId: 'com.vora.earning',
  appName: 'VORA EARNING',
  webDir: 'dist',
  // NOTE: No server.url here — app loads from bundled files (Play Store compliant)
  // API calls go to Railway via VITE_API_URL set during build
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
