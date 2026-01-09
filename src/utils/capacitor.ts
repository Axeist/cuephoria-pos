import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

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
 * Splash Screen
 */
export const hideSplashScreen = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await SplashScreen.hide();
  } catch (error) {
    console.warn('SplashScreen not available:', error);
  }
};

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
 * Initialize mobile features on app start
 */
export const initializeMobileApp = async () => {
  if (!isNativePlatform()) return;
  
  console.log('Initializing mobile app...');
  
  try {
    // Hide splash screen after app is ready
    await hideSplashScreen();
    
    // Set status bar style
    await setStatusBarColor('#000000', false);
    
    // Log app info
    const appInfo = await getAppInfo();
    console.log('App Info:', appInfo);
    
    // Check network status
    const networkStatus = await checkNetworkStatus();
    console.log('Network Status:', networkStatus);
    
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
  hideSplashScreen,
  getAppInfo,
  addAppStateListener,
  addBackButtonListener,
  initializeMobileApp,
  getSafeAreaInsets,
  exitApp,
};
