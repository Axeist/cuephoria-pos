# 🎨 Android Resources Template

This guide shows you how to customize your Android app's appearance with icons, splash screens, and branding.

## 📱 App Icon Requirements

### Icon Sizes Needed

Your app needs multiple icon sizes for different screen densities. Here's what you need:

| Density | Size (px) | Location |
|---------|-----------|----------|
| mdpi | 48 × 48 | `android/app/src/main/res/mipmap-mdpi/` |
| hdpi | 72 × 72 | `android/app/src/main/res/mipmap-hdpi/` |
| xhdpi | 96 × 96 | `android/app/src/main/res/mipmap-xhdpi/` |
| xxhdpi | 144 × 144 | `android/app/src/main/res/mipmap-xxhdpi/` |
| xxxhdpi | 192 × 192 | `android/app/src/main/res/mipmap-xxxhdpi/` |

### File Names
- `ic_launcher.png` - Square icon
- `ic_launcher_round.png` - Round icon (optional but recommended)
- `ic_launcher_foreground.png` - Adaptive icon foreground
- `ic_launcher_background.png` - Adaptive icon background

### Easy Way: Use Icon Generator

**Recommended Tool:** https://icon.kitchen/

Steps:
1. Go to https://icon.kitchen/
2. Upload your logo (recommended: 1024×1024 PNG with transparent background)
3. Customize:
   - Choose background color: `#1A1F2E` (Cuephoria dark)
   - Adjust padding
   - Preview on different devices
4. Click "Download"
5. Extract the ZIP
6. Copy all `mipmap-*` folders to `android/app/src/main/res/`
7. Replace existing folders

## 🌅 Splash Screen

### What is a Splash Screen?
The splash screen shows when your app is launching, before the main content loads.

### Requirements
- **Size:** 2732 × 2732 pixels (square)
- **Format:** PNG with transparency
- **Content:** Centered logo with plenty of padding
- **Background:** Should match your app theme

### Location
```
android/app/src/main/res/drawable/splash.png
```

### Design Tips
1. **Keep it simple** - Just your logo centered
2. **Use padding** - Logo should be about 30% of total size
3. **Match theme** - Background should be your app's background color
4. **Test on different screens** - It will be cropped differently on various devices

### Creating Your Splash Screen

#### Option 1: Photoshop/Figma
1. Create 2732 × 2732 canvas
2. Fill with background color: `#1A1F2E`
3. Place logo in center (about 800 × 800)
4. Export as PNG

#### Option 2: Online Tool
Use https://www.canva.com/:
1. Create custom size: 2732 × 2732
2. Fill background
3. Add your logo
4. Download as PNG

#### Quick Template
```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│       ┌───────┐         │
│       │ LOGO  │         │  ← Your logo here
│       └───────┘         │
│                         │
│                         │
│                         │
└─────────────────────────┘
```

### Configure Splash Screen

Edit `capacitor.config.ts`:

```typescript
SplashScreen: {
  launchShowDuration: 2000,           // Show for 2 seconds
  launchAutoHide: true,               // Auto-hide when app loads
  launchFadeOutDuration: 500,         // Fade out animation
  backgroundColor: "#1A1F2E",         // Your brand color
  androidSplashResourceName: "splash",
  androidScaleType: "CENTER_CROP",    // How to scale image
  showSpinner: false,                 // Hide loading spinner
  splashFullScreen: true,             // Full screen mode
  splashImmersive: true,              // Hide status bar
}
```

## 🎨 Brand Colors

### Update Theme Colors

#### Status Bar
Edit `capacitor.config.ts`:

```typescript
StatusBar: {
  style: 'dark',                      // 'dark' or 'light' text
  backgroundColor: '#1A1F2E'          // Your brand color
}
```

#### Android Theme
Edit `android/app/src/main/res/values/styles.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Cuephoria Theme -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">#9B87F5</item>        <!-- Primary brand color -->
        <item name="colorPrimaryDark">#1A1F2E</item>    <!-- Status bar color -->
        <item name="colorAccent">#0EA5E9</item>         <!-- Accent color -->
        <item name="android:windowBackground">@color/background</item>
    </style>
    
    <!-- Splash Theme -->
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="android:windowBackground">@drawable/splash</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
```

#### Colors
Edit `android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Cuephoria Brand Colors -->
    <color name="colorPrimary">#9B87F5</color>
    <color name="colorPrimaryDark">#1A1F2E</color>
    <color name="colorAccent">#0EA5E9</color>
    <color name="background">#1A1F2E</color>
    <color name="backgroundDark">#13161F</color>
</resources>
```

## 📝 App Name & Details

### App Display Name

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Cuephoria POS</string>
    <string name="title_activity_main">Cuephoria</string>
    <string name="package_name">com.cuephoria.pos</string>
    <string name="custom_url_scheme">cuephoria</string>
</resources>
```

### Version Information

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.cuephoria.pos"
        minSdkVersion 22              // Minimum Android version (Android 5.1)
        targetSdkVersion 33           // Target Android version
        versionCode 1                 // Increment for each release
        versionName "1.0.0"           // Display version
    }
}
```

**Version Guidelines:**
- `versionCode`: Integer that increases with each release (1, 2, 3...)
- `versionName`: Display version string (1.0.0, 1.0.1, 1.1.0...)

### Package Name
Format: `com.yourcompany.appname`

Current: `com.cuephoria.pos`

**⚠️ Warning:** Once you publish to Google Play, you CANNOT change the package name!

## 🔒 Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.cuephoria.pos">

    <!-- Required Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Optional Permissions (add if needed) -->
    <!-- <uses-permission android:name="android.permission.CAMERA" /> -->
    <!-- <uses-permission android:name="android.permission.VIBRATE" /> -->
    <!-- <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" /> -->
    <!-- <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" /> -->
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
        </activity>
    </application>
</manifest>
```

## 🎯 Quick Setup Checklist

Use this checklist when customizing your app:

### Pre-Launch Checklist

- [ ] **App Icon**
  - [ ] Generated all sizes (mdpi to xxxhdpi)
  - [ ] Copied to `mipmap-*` folders
  - [ ] Includes round icon variant
  - [ ] Tested on different devices

- [ ] **Splash Screen**
  - [ ] Created 2732×2732 PNG
  - [ ] Placed in `drawable/splash.png`
  - [ ] Configured in `capacitor.config.ts`
  - [ ] Background color matches theme

- [ ] **Branding**
  - [ ] Updated app name in `strings.xml`
  - [ ] Set brand colors in `colors.xml`
  - [ ] Configured status bar color
  - [ ] Updated theme in `styles.xml`

- [ ] **App Details**
  - [ ] Package name is final
  - [ ] Version code set correctly
  - [ ] Version name matches release
  - [ ] Required permissions declared

- [ ] **Testing**
  - [ ] Tested on multiple screen sizes
  - [ ] Checked all icon sizes
  - [ ] Verified splash screen timing
  - [ ] Confirmed colors look good
  - [ ] Tested on Android 12+ (Material You)

## 🛠️ Advanced Customization

### Adaptive Icons (Android 8+)

Adaptive icons have separate foreground and background layers.

Create `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

### Custom Fonts

1. Add font files to `android/app/src/main/assets/fonts/`
2. Use in your web CSS (fonts will work in the WebView)

### Dark Theme Support

Add `android/app/src/main/res/values-night/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#9B87F5</color>
    <color name="colorPrimaryDark">#000000</color>
    <color name="colorAccent">#0EA5E9</color>
    <color name="background">#000000</color>
</resources>
```

## 📱 Testing Your Changes

After making changes:

```bash
# Rebuild and sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android

# Run on device/emulator
# Click the Play button (▶️)
```

## 🎨 Design Resources

### Color Palettes
- Current primary: `#9B87F5` (Cuephoria Purple)
- Current accent: `#0EA5E9` (Cuephoria Blue)
- Background: `#1A1F2E` (Dark)

### Icon Design Guidelines
- **Simple is better** - Icons should be recognizable at small sizes
- **Avoid text** - Icons shouldn't have text
- **Use vectors** - Start with vector (SVG) for best quality
- **Safe zone** - Keep important content in center 66%
- **Contrast** - Ensure good contrast with potential backgrounds

### Useful Tools
- **Icon Generator:** https://icon.kitchen/
- **Splash Generator:** https://apetools.webprofusion.com/#/tools/imagegorilla
- **Color Picker:** https://colorhunt.co/
- **Asset Studio:** https://romannurik.github.io/AndroidAssetStudio/

## 💾 Backup Your Resources

Before making changes, backup these folders:

```bash
cp -r android/app/src/main/res android/app/src/main/res.backup
```

To restore:

```bash
rm -rf android/app/src/main/res
mv android/app/src/main/res.backup android/app/src/main/res
```

---

## 🎓 Next Steps

1. ✅ Generate your app icon using icon.kitchen
2. ✅ Create your splash screen
3. ✅ Update colors and branding
4. ✅ Set app name and version
5. ✅ Test on real devices
6. ✅ Build and share!

---

**Need help?** Check [BEGINNERS_GUIDE.md](./BEGINNERS_GUIDE.md) or [ANDROID_SETUP_GUIDE.md](./ANDROID_SETUP_GUIDE.md)

**Made with ❤️ for Cuephoria POS**
