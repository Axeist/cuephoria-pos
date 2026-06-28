import { CapacitorConfig } from '@capacitor/core';

/**
 * Android-only: set CAPACITOR_SERVER_URL when running `npm run android:sync:play`
 * or `android:release:play` so the WebView loads your live site (required for
 * Play Store /api/* auth). When unset, Capacitor uses bundled `dist/` (unchanged
 * default). This file is not used by the Vercel web deploy.
 */
const capacitorServerUrl = process.env.CAPACITOR_SERVER_URL?.trim().replace(/\/+$/, '');

const config: CapacitorConfig = {
  appId: 'com.cuephoria.pos',
  appName: 'Cuetronix',
  webDir: 'dist',
  server: capacitorServerUrl
    ? {
        url: capacitorServerUrl,
        androidScheme: 'https',
        cleartext: false,
      }
    : {
        androidScheme: 'https',
        // Local dev on device: CAPACITOR_SERVER_URL=http://192.168.x.x:8080 npm run android:sync
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
