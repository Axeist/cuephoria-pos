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
      launchShowDuration: 0,
      launchAutoHide: true,
      launchFadeOutDuration: 0,
      backgroundColor: "#1a1a2e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#00d4ff",
      splashFullScreen: false,
      splashImmersive: false,
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
