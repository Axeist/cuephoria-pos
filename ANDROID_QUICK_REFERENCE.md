# ⚡ Android Quick Reference Card

One-page cheat sheet for daily Android development tasks.

---

## 🚀 Essential Commands

```bash
# Setup (run once)
./setup-android.sh

# Daily workflow
npm run android:run              # Build, sync, and open in Android Studio

# Individual steps
npm run build                    # Build web app
npx cap sync android            # Sync to Android
npx cap open android            # Open Android Studio

# Building
npm run android:build           # Build debug APK
npm run android:release         # Build release AAB (for Play Store)

# Device management
adb devices                     # List connected devices
adb install path/to/app.apk   # Install APK
adb logcat                      # View logs
```

---

## 📁 Key Files & Locations

| File | Purpose | Path |
|------|---------|------|
| **Capacitor Config** | App settings | `capacitor.config.ts` |
| **App Name** | Display name | `android/app/src/main/res/values/strings.xml` |
| **Permissions** | App permissions | `android/app/src/main/AndroidManifest.xml` |
| **Version** | Version numbers | `android/app/build.gradle` |
| **Icons** | App icons | `android/app/src/main/res/mipmap-*/` |
| **Splash Screen** | Launch screen | `android/app/src/main/res/drawable/splash.png` |
| **Colors** | Theme colors | `android/app/src/main/res/values/colors.xml` |
| **Debug APK** | Test build | `android/app/build/outputs/apk/debug/app-debug.apk` |
| **Release AAB** | Play Store | `android/app/build/outputs/bundle/release/app-release.aab` |

---

## 🛠️ Common Tasks

### Change App Name
```xml
<!-- android/app/src/main/res/values/strings.xml -->
<string name="app_name">Your App Name</string>
```

### Update Version
```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 2          // Increment for each release
    versionName "1.0.1"    // Display version
}
```

### Add Permission
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
```

### Change Status Bar Color
```typescript
// capacitor.config.ts
StatusBar: {
  backgroundColor: '#1A1F2E',  // Your color
  style: 'dark'                // 'dark' or 'light' text
}
```

### Update Splash Screen Duration
```typescript
// capacitor.config.ts
SplashScreen: {
  launchShowDuration: 2000,  // milliseconds
  backgroundColor: "#1A1F2E"
}
```

---

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| **White screen** | `npm run build && npx cap sync android` |
| **Build fails** | `cd android && ./gradlew clean && cd ..` |
| **Device not found** | `adb kill-server && adb start-server` |
| **Can't find adb** | Check ANDROID_HOME in `~/.zshrc` |
| **Signing error** | Check `android/gradle.properties` |
| **Old changes showing** | Force close app on device, reinstall |

---

## 📱 Testing Checklist

Before releasing:

- [ ] Test on Android 12+ device
- [ ] Test with slow/no internet
- [ ] Test all main features
- [ ] Check app doesn't crash
- [ ] Verify back button works
- [ ] Test on different screen sizes
- [ ] Install from APK file
- [ ] Check app icon looks good
- [ ] Verify splash screen shows

---

## 🔐 Keystore Info (Keep Safe!)

```bash
# Create keystore (first time only)
cd android/app
keytool -genkey -v -keystore cuephoria-release-key.keystore \
  -alias cuephoria -keyalg RSA -keysize 2048 -validity 10000

# Backup these files to secure location:
# - cuephoria-release-key.keystore
# - Your keystore password
# - Your key password
```

---

## 📦 Package Info

```
App ID: com.cuephoria.pos
App Name: Cuephoria POS
Bundle ID: com.cuephoria.pos
Min SDK: 22 (Android 5.1)
Target SDK: 33 (Android 13)
```

---

## 🌐 Useful URLs

- **Play Console:** https://play.google.com/console
- **Icon Generator:** https://icon.kitchen/
- **Android Docs:** https://developer.android.com/
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Stack Overflow:** https://stackoverflow.com/questions/tagged/android

---

## 📖 Documentation

| Guide | When to Use |
|-------|-------------|
| **BEGINNERS_GUIDE.md** | Never coded before? Start here! |
| **ANDROID_SETUP_GUIDE.md** | Technical setup instructions |
| **ANDROID_DEPLOYMENT_GUIDE.md** | Publishing to Play Store |
| **ANDROID_RESOURCES_TEMPLATE.md** | Customizing icons and colors |
| **ANDROID_README.md** | General project overview |

---

## 💡 Pro Tips

1. **Always test on real device** - Emulators can be misleading
2. **Backup your keystore** - You can't update without it!
3. **Increment version code** - Required for each Play Store upload
4. **Use staged rollout** - Release to 20% first, then 100%
5. **Respond to reviews** - Shows you care about users
6. **Keep docs updated** - Document your changes
7. **Test before building** - Don't build broken code
8. **Use Git tags** - Tag each release version

---

## 🎯 Daily Workflow

```bash
# 1. Make changes to your code
# Edit files in src/

# 2. Test in browser first
npm run dev

# 3. Build and test on Android
npm run android:run

# 4. Test on device
# Click Play ▶️ in Android Studio

# 5. Fix any issues
# Repeat steps 1-4

# 6. Ready to share?
npm run android:build
# Share the APK file!
```

---

## 📊 Version History Template

Keep this in a `CHANGELOG.md`:

```markdown
## [1.0.1] - 2024-01-15
### Fixed
- Fixed crash on login
- Improved loading speed

### Added
- Dark mode support

### Changed
- Updated UI colors
```

---

## 🆘 Emergency Commands

```bash
# Nuclear option (start fresh)
rm -rf android/
npx cap add android
npx cap sync android

# Clean everything
cd android
./gradlew clean
./gradlew cleanBuildCache
cd ..
npm run build
npx cap sync android

# Reset device
adb shell pm clear com.cuephoria.pos

# Uninstall from device
adb uninstall com.cuephoria.pos
```

---

## 🎨 Design Specs

### Icons
- **mdpi:** 48×48
- **hdpi:** 72×72
- **xhdpi:** 96×96
- **xxhdpi:** 144×144
- **xxxhdpi:** 192×192
- **Play Store:** 512×512

### Splash Screen
- **Size:** 2732×2732
- **Format:** PNG
- **Logo:** Centered, ~30% of total size

### Screenshots
- **Portrait:** 1080×1920
- **Landscape:** 1920×1080
- **Minimum:** 2 screenshots
- **Maximum:** 8 screenshots

### Feature Graphic
- **Size:** 1024×500
- **Format:** PNG or JPEG

---

## 🔔 Notifications

```bash
# Test notification (if implemented)
adb shell am broadcast -a com.cuephoria.pos.TEST_NOTIFICATION
```

---

## 📱 Devices & Screen Sizes

Common test devices:
- **Pixel 5** (1080×2340, 432 dpi)
- **Samsung Galaxy S21** (1080×2400, 421 dpi)
- **Xiaomi Redmi Note** (1080×2400, 395 dpi)

Test on:
- Small (< 5.5")
- Medium (5.5" - 6.5")
- Large (> 6.5")
- Tablet (7"+)

---

## 🎓 Learning Path

1. ✅ Read BEGINNERS_GUIDE.md
2. ✅ Run setup-android.sh
3. ✅ Build and test debug APK
4. ✅ Customize icons and splash
5. ✅ Test on real device
6. ✅ Create signed keystore
7. ✅ Build release AAB
8. ✅ Submit to Play Store

---

**Print this page and keep it handy! 📄**

*Last updated: 2024*
