# 🎮 Splash Screen Quick Start Guide

## What's Already Done ✅

Your splash screen is **already configured** in `capacitor.config.ts` with:
- ⏱️ **Duration**: 2.5 seconds
- 🎨 **Background**: Dark blue-purple (#1a1a2e) - perfect for your neon gaming logo
- 🎭 **Animation**: Smooth 500ms fade out
- 📱 **Full screen**: Immersive experience
- 🎯 **Scale**: CENTER_INSIDE (logo won't be cropped)

## Quick Setup (3 Steps)

### Step 1: Save Your Logo
Save your Cuephoria Gaming logo (the one with the neon controller and gradient text) as:
```
splash-screen-base.png
```
in the project root directory.

**Requirements:**
- High resolution (at least 2000×2000px, preferably 3000×3000px)
- PNG format with transparency
- Logo should be centered on transparent background

### Step 2: Generate Splash Screens

**Option A - JavaScript (Easiest):**
```bash
node generate-splash.js
```
This will automatically install dependencies and generate all sizes.

**Option B - Bash Script:**
```bash
# Install ImageMagick first (if not installed)
brew install imagemagick

# Then run the script
./generate-splash.sh
```

### Step 3: Sync to Android
```bash
npm run android:sync
```

## That's It! 🚀

Now when your app launches, users will see:
1. Your beautiful Cuephoria Gaming neon logo
2. On a dark gaming-themed background
3. For 2.5 seconds with a smooth fade
4. Full screen immersive experience

## Testing

```bash
# Open in Android Studio
npm run cap:open:android

# Build and run on device or emulator
# The splash screen will show on app launch
```

## Customization

### Change Colors
Edit `capacitor.config.ts`:
```typescript
backgroundColor: "#1a1a2e",  // Your color here
spinnerColor: "#00d4ff",     // Cyan accent
```

### Change Timing
```typescript
launchShowDuration: 3000,      // Show longer (3 seconds)
launchFadeOutDuration: 1000,   // Slower fade (1 second)
```

### Add Loading Spinner
```typescript
showSpinner: true,              // Show loading indicator
androidSpinnerStyle: "large",   // large, small, or inverse
spinnerColor: "#ff00ff",        // Pink/purple to match brand
```

## File Structure

After generation, you'll have:
```
android/app/src/main/res/
├── drawable/splash.png (2732×2732)
├── drawable-port-mdpi/splash.png (480×800)
├── drawable-port-hdpi/splash.png (800×1280)
├── drawable-port-xhdpi/splash.png (1280×1920)
├── drawable-port-xxhdpi/splash.png (1600×2560)
├── drawable-port-xxxhdpi/splash.png (1920×3200)
├── drawable-land-mdpi/splash.png (800×480)
├── drawable-land-hdpi/splash.png (1280×800)
├── drawable-land-xhdpi/splash.png (1920×1280)
├── drawable-land-xxhdpi/splash.png (2560×1600)
└── drawable-land-xxxhdpi/splash.png (3200×1920)
```

## Troubleshooting

**Splash not showing?**
- Clean build: `cd android && ./gradlew clean`
- Re-sync: `npm run android:sync`
- Rebuild app

**Logo looks stretched?**
- Try `androidScaleType: "FIT_CENTER"` in config
- Ensure source image has equal width/height

**Wrong colors?**
- Check source image is sRGB color space
- Verify backgroundColor in config

## Pro Tips 💡

1. **Design Tip**: Your neon logo looks best with plenty of breathing room. Keep logo at ~60-70% of screen size.

2. **Performance**: Optimize your source PNG before generating (use tools like TinyPNG or ImageOptim).

3. **Branding**: The dark blue-purple background (#1a1a2e) complements your neon cyan/pink gradient perfectly.

4. **Testing**: Test on different screen sizes to ensure logo looks good on all devices.

5. **Updates**: Whenever you update the logo, just replace `splash-screen-base.png` and re-run the generator.

## Need Help?

- 📖 Full guide: See `SPLASH_SCREEN_SETUP.md`
- 🔌 Capacitor docs: https://capacitorjs.com/docs/apis/splash-screen
- 🎨 Icon guide: https://capacitorjs.com/docs/guides/splash-screens-and-icons
