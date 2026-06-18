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
