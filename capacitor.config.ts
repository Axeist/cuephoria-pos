import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.cuephoria.pos',
  appName: 'Cuephoria',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development with local server, uncomment and set your computer's IP:
    // url: 'http://192.168.1.XXX:8080',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,       // Show for 3 seconds (matches React splash)
      launchAutoHide: false,          // Don't auto-hide, let app control it
      launchFadeOutDuration: 300,     // Smooth 300ms fade out
      backgroundColor: "#1a1a2e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP", // Better scaling for full screen
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#00d4ff",
      splashFullScreen: true,         // Full screen for immersive experience
      splashImmersive: true,          // Hide status/nav bars during splash
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    }
  }
};

export default config;
