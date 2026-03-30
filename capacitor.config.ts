import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintmena.app',
  appName: 'MaintMENA',
  webDir: 'dist',
  // For Median (GoNative) builds the web app is served from Vercel.
  // For local Capacitor development, comment out `server` to use bundled assets.
  server: {
    // Production — points to Vercel deployment.
    // Change to your actual domain before running `npx cap sync`.
    url: 'https://maintmena.vercel.app',
    cleartext: false,
    // Allow the app to handle Universal Links (iOS) / App Links (Android)
    // and the custom scheme maintmena://
    androidScheme: 'maintmena',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
    // Keyboard plugin configuration
    Keyboard: {
      // Resize the WebView body when the keyboard appears (not the whole window)
      resize: 'body',
      // Don't scroll to focused input automatically — we handle it in useKeyboardAvoidance
      scrollAssist: false,
    },
  },
};

export default config;
