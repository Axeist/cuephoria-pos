import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Utility functions for Capacitor mobile features
 */

// Check if running on native platform
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Check if running on Android
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

// Check if running on iOS
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

// Check if running in web browser
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Haptic Feedback
 */
export const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isNativePlatform()) return;
  
  try {
    const impactStyles = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: impactStyles[style] });
  } catch (error) {
    console.warn('Haptics not available:', error);
  }
};

export const hapticVibrate = async (duration: number = 300) => {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.vibrate({ duration });
  } catch (error) {
    console.warn('Haptics not available:', error);
  }
};

/**
 * Keyboard Management
 */
export const hideKeyboard = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await Keyboard.hide();
  } catch (error) {
    console.warn('Keyboard control not available:', error);
  }
};

export const showKeyboard = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await Keyboard.show();
  } catch (error) {
    console.warn('Keyboard control not available:', error);
  }
};

/**
 * Network Status
 */
export const checkNetworkStatus = async () => {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    console.warn('Network status not available:', error);
    return { connected: true, connectionType: 'unknown' };
  }
};

export const addNetworkListener = (callback: (connected: boolean) => void) => {
  if (!isNativePlatform()) return () => {};
  
  const listener = Network.addListener('networkStatusChange', (status) => {
    callback(status.connected);
  });
  
  return () => listener.remove();
};

/**
 * Status Bar
 */
export const setStatusBarColor = async (color: string, darkText: boolean = false) => {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style: darkText ? Style.Light : Style.Dark });
  } catch (error) {
    console.warn('StatusBar not available:', error);
  }
};

export const hideStatusBar = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.hide();
  } catch (error) {
    console.warn('StatusBar not available:', error);
  }
};

export const showStatusBar = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.show();
  } catch (error) {
    console.warn('StatusBar not available:', error);
  }
};

/**
 * Splash Screen - REMOVED
 * Splash screen plugin has been uninstalled
 */
// export const hideSplashScreen = async () => {
//   // Splash screen plugin removed
// };

/**
 * App Info & Events
 */
export const getAppInfo = async () => {
  if (!isNativePlatform()) {
    return { name: 'Cuephoria', version: '1.0.0', build: '1' };
  }
  
  try {
    return await App.getInfo();
  } catch (error) {
    console.warn('App info not available:', error);
    return { name: 'Cuephoria', version: '1.0.0', build: '1' };
  }
};

export const addAppStateListener = (callback: (isActive: boolean) => void) => {
  if (!isNativePlatform()) return () => {};
  
  const listener = App.addListener('appStateChange', ({ isActive }) => {
    callback(isActive);
  });
  
  return () => listener.remove();
};

// Handle Android back button
export const addBackButtonListener = (callback: () => void) => {
  if (!isAndroid()) return () => {};
  
  const listener = App.addListener('backButton', () => {
    callback();
  });
  
  return () => listener.remove();
};

/**
 * Default Android back-button behavior:
 *  1. If a Radix-based dialog/sheet/drawer is currently open, close it.
 *  2. Otherwise navigate back in the history if possible.
 *  3. Otherwise exit the app.
 *
 * Returns the unsubscribe function so callers (or `initializeMobileApp`)
 * can unregister it on teardown.
 */
export const installDefaultBackButtonBehavior = () => {
  if (!isAndroid()) return () => {};

  const handler = () => {
    // Radix portals every Dialog/Sheet at the document root, with a
    // `data-state="open"` attribute on the content element. Closing the
    // topmost (last) open layer first matches user expectation.
    const openLayers = document.querySelectorAll<HTMLElement>(
      '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]',
    );
    if (openLayers.length > 0) {
      // Synthesize an Escape keydown — Radix listens for it on its overlay
      // and will close the topmost layer automatically.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // Nothing left to back out of — exit the app.
    App.exitApp().catch(() => {
      // Some Android versions throw if exitApp is not permitted; ignore.
    });
  };

  return addBackButtonListener(handler);
};

/**
 * Initialize mobile features on app start
 * NOTE: Splash screen will be hidden by the app when ready, not here
 */
export const initializeMobileApp = async () => {
  if (!isNativePlatform()) return;
  
  console.log('Initializing mobile app...');
  
  try {
    // DON'T hide splash screen here - let the app control when to hide it
    // This prevents the jarring flash between native and React splash screens
    
    // Set status bar style
    await setStatusBarColor('#000000', false);
    
    // Log app info
    const appInfo = await getAppInfo();
    console.log('App Info:', appInfo);
    
    // Check network status
    const networkStatus = await checkNetworkStatus();
    console.log('Network Status:', networkStatus);

    // Wire Android hardware back to close open dialogs/sheets first, then
    // navigate back, then exit. Without this the OS back gesture would
    // always exit the app which is jarring inside a deep dialog flow.
    installDefaultBackButtonBehavior();
    
    console.log('Mobile app initialized successfully!');
  } catch (error) {
    console.error('Error initializing mobile app:', error);
  }
};

/**
 * Safe area insets for notched devices
 */
export const getSafeAreaInsets = () => {
  if (!isNativePlatform()) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  // These values are set by CSS env() variables in global styles
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
  };
};

/**
 * Exit app (Android only)
 */
export const exitApp = async () => {
  if (!isAndroid()) return;
  
  try {
    await App.exitApp();
  } catch (error) {
    console.warn('Exit app not available:', error);
  }
};

export default {
  isNativePlatform,
  isAndroid,
  isIOS,
  isWeb,
  hapticImpact,
  hapticVibrate,
  hideKeyboard,
  showKeyboard,
  checkNetworkStatus,
  addNetworkListener,
  setStatusBarColor,
  hideStatusBar,
  showStatusBar,
  // hideSplashScreen, // Removed - splash screen plugin uninstalled
  getAppInfo,
  addAppStateListener,
  addBackButtonListener,
  installDefaultBackButtonBehavior,
  initializeMobileApp,
  getSafeAreaInsets,
  exitApp,
};
