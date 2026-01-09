# 🤖 Android App Setup Guide for Cuephoria POS

## 📋 Complete Guide for Beginners

This guide will help you convert your Cuephoria web app into a fully functional Android application, even if you have no coding experience!

---

## 🎯 What We're Doing

We're using **Capacitor** by Ionic to wrap your existing React web app into a native Android app. Think of it as putting your website into an app shell that can be installed on Android phones.

---

## 📦 Prerequisites (Software You Need to Install)

### 1. Node.js (Already Installed ✓)
Your project already has this, so you're good!

### 2. Android Studio (Required for Android Development)

**Download & Install:**
1. Go to: https://developer.android.com/studio
2. Download Android Studio for macOS
3. Run the installer (it's about 1GB)
4. During setup, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (for testing)

**Setup Android Studio:**
1. Open Android Studio
2. Click "More Actions" → "SDK Manager"
3. In "SDK Platforms" tab, check:
   - ✓ Android 13.0 (Tiramisu) - API Level 33
   - ✓ Android 12.0 (S) - API Level 31
4. In "SDK Tools" tab, check:
   - ✓ Android SDK Build-Tools
   - ✓ Android SDK Command-line Tools
   - ✓ Android Emulator
   - ✓ Android SDK Platform-Tools
5. Click "Apply" and wait for downloads

### 3. Java Development Kit (JDK)

Android Studio includes JDK, but let's verify:

```bash
java -version
```

If not found, Android Studio's JDK is at:
```
/Applications/Android Studio.app/Contents/jbr/Contents/Home
```

### 4. Set Environment Variables

Open Terminal and run:

```bash
# Open your shell profile
nano ~/.zshrc

# Add these lines at the end:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$PATH:$JAVA_HOME/bin

# Save: Press Ctrl+O, Enter, then Ctrl+X

# Apply changes
source ~/.zshrc
```

Verify setup:
```bash
echo $ANDROID_HOME
adb --version
```

---

## 🚀 Step-by-Step Conversion Process

### Step 1: Install Capacitor

```bash
# Navigate to your project
cd /Users/cave/Downloads/cuephoria-pos

# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Install Android platform
npm install @capacitor/android

# Install useful plugins
npm install @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/network @capacitor/splash-screen
```

### Step 2: Initialize Capacitor

```bash
# Initialize Capacitor in your project
npx cap init "Cuephoria POS" "com.cuephoria.pos" --web-dir=dist
```

**What this does:**
- App Name: "Cuephoria POS"
- Package ID: "com.cuephoria.pos" (unique identifier for your app)
- Web Directory: "dist" (where your built files go)

### Step 3: Add Android Platform

```bash
# Add Android platform
npx cap add android
```

This creates an `android/` folder with your native Android project!

### Step 4: Build Your Web App

```bash
# Build the React app for production
npm run build
```

### Step 5: Sync to Android

```bash
# Copy web assets to Android project
npx cap sync android
```

### Step 6: Open in Android Studio

```bash
# Open the Android project in Android Studio
npx cap open android
```

---

## 🎨 Customizing Your Android App

### App Name
Edit: `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Cuephoria POS</string>
```

### App Icon
Replace these files in `android/app/src/main/res/`:
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

**Easy Icon Generator:** https://icon.kitchen/

### Splash Screen
Edit: `android/app/src/main/res/drawable/splash.png`
Recommended size: 2732x2732 px with centered logo

### Permissions
Edit: `android/app/src/main/AndroidManifest.xml`

Your app needs:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" /> <!-- If using QR codes -->
<uses-permission android:name="android.permission.VIBRATE" /> <!-- For haptic feedback -->
```

---

## 📱 Testing Your App

### Method 1: Using Android Emulator (Virtual Device)

1. In Android Studio, click "Device Manager" (phone icon)
2. Click "Create Device"
3. Select "Pixel 5" or any phone
4. Download system image (API 33)
5. Click "Finish"
6. Click the Play button (▶️) next to your device
7. Wait for emulator to start
8. In Android Studio, click "Run" (green play button) or press Shift+F10

### Method 2: Using Real Android Phone (Recommended!)

1. **Enable Developer Options on your phone:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

3. **Connect your phone:**
   - Connect phone to computer via USB
   - Approve the popup on your phone
   - Run in Terminal: `adb devices`
   - You should see your device listed

4. **Run the app:**
   - In Android Studio, click "Run" (green play button)
   - Select your device
   - App will install and launch!

---

## 🔄 Development Workflow

Every time you make changes to your web app:

```bash
# 1. Build the web app
npm run build

# 2. Sync changes to Android
npx cap sync android

# 3. The app will hot-reload in Android Studio
```

For live development:
```bash
# Run development server
npm run dev

# Then update capacitor.config.ts to use your local server
# (See Configuration section below)
```

---

## ⚙️ Configuration Files

### capacitor.config.ts (Created for you)
```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.cuephoria.pos',
  appName: 'Cuephoria POS',
  webDir: 'dist',
  server: {
    // For development, use your local server:
    // url: 'http://192.168.1.XXX:5173',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    }
  }
};

export default config;
```

---

## 🏗️ Building Release APK/AAB

### For Testing (APK):

1. In Android Studio, go to: Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Wait for build to complete
3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`
4. Install on any Android device!

### For Google Play Store (AAB):

1. **Create a Keystore (first time only):**
```bash
cd android/app
keytool -genkey -v -keystore cuephoria-release-key.keystore -alias cuephoria -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure signing:**
Create `android/gradle.properties`:
```properties
CUEPHORIA_RELEASE_STORE_FILE=cuephoria-release-key.keystore
CUEPHORIA_RELEASE_KEY_ALIAS=cuephoria
CUEPHORIA_RELEASE_STORE_PASSWORD=YOUR_STORE_PASSWORD
CUEPHORIA_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

Edit `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(CUEPHORIA_RELEASE_STORE_FILE)
            storePassword CUEPHORIA_RELEASE_STORE_PASSWORD
            keyAlias CUEPHORIA_RELEASE_KEY_ALIAS
            keyPassword CUEPHORIA_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

3. **Build release AAB:**
```bash
cd android
./gradlew bundleRelease
```

4. **Output location:**
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 🐛 Common Issues & Solutions

### Issue: "Command not found: adb"
**Solution:** Android SDK not in PATH. Re-check environment variables.

### Issue: "No connected devices"
**Solution:** 
- Enable USB Debugging on phone
- Try different USB cable
- Run: `adb kill-server` then `adb start-server`

### Issue: App shows white screen
**Solution:**
- Check `capacitor.config.ts` has correct `webDir`
- Run `npm run build` before `npx cap sync`
- Check browser console in Chrome DevTools: chrome://inspect

### Issue: "Gradle build failed"
**Solution:**
- Open Android Studio
- File → Invalidate Caches → Invalidate and Restart
- In Terminal: `cd android && ./gradlew clean`

### Issue: Network requests fail
**Solution:**
- Add INTERNET permission to AndroidManifest.xml
- Check CORS settings on your Supabase backend
- For development with local server, use your computer's IP, not localhost

---

## 🎓 Learning Resources

### Android Development:
- Android Developer Docs: https://developer.android.com/
- Capacitor Docs: https://capacitorjs.com/docs

### Video Tutorials:
- "Capacitor Tutorial" on YouTube
- "How to convert React app to Android" on YouTube

### Debug Tools:
- Chrome DevTools: chrome://inspect (inspect your app like a website!)
- Android Logcat in Android Studio (see all logs)

---

## 🚢 Deployment Checklist

Before publishing to Google Play:

- [ ] Test on multiple Android devices/versions
- [ ] Test with slow internet connection
- [ ] Test offline functionality (if applicable)
- [ ] Update app version in `android/app/build.gradle`
- [ ] Create proper app icon (all sizes)
- [ ] Create splash screen
- [ ] Set up proper permissions
- [ ] Test payment flows thoroughly
- [ ] Create privacy policy (required by Google Play)
- [ ] Create app screenshots and description
- [ ] Sign up for Google Play Console ($25 one-time fee)
- [ ] Upload AAB file
- [ ] Fill out store listing
- [ ] Submit for review

---

## 💡 Next Steps After Android

### 1. iOS App (if needed)
```bash
npm install @capacitor/ios
npx cap add ios
npx cap open ios
```

### 2. Progressive Web App (PWA)
Your app can also work as a PWA for desktop browsers!

### 3. Native Features
Add plugins for:
- Push notifications
- Camera/QR scanner
- Biometric authentication
- Local storage
- And more!

---

## 📞 Getting Help

If you get stuck:
1. Check error messages carefully
2. Google the error with "Capacitor" or "Android"
3. Check Stack Overflow
4. Ask in Capacitor Discord: https://ionic.link/discord
5. Re-read this guide - answer might be here!

---

**Remember:** Building an Android app is a learning process. Don't worry if it doesn't work perfectly the first time. Each error teaches you something new!

Good luck! 🚀
