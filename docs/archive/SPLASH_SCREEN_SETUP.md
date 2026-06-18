# Splash Screen Setup Guide

## Overview
This guide will help you set up your Cuephoria Gaming logo as the splash screen for your Android app.

## Current Configuration

Your `capacitor.config.ts` already has the splash screen configured with these settings:

```typescript
SplashScreen: {
  launchShowDuration: 2000,        // Show for 2 seconds
  launchAutoHide: true,            // Auto-hide after duration
  launchFadeOutDuration: 500,      // Fade out over 500ms
  backgroundColor: "#000000",       // Black background
  androidSplashResourceName: "splash",
  androidScaleType: "CENTER_CROP",
  showSpinner: false,
  splashFullScreen: true,
  splashImmersive: true,
}
```

## Required Splash Screen Sizes

You need to create splash screen images in the following sizes for different screen densities:

### Portrait Orientations
- **drawable-port-mdpi**: 480×800px
- **drawable-port-hdpi**: 800×1280px
- **drawable-port-xhdpi**: 1280×1920px
- **drawable-port-xxhdpi**: 1600×2560px
- **drawable-port-xxxhdpi**: 1920×3200px

### Landscape Orientations
- **drawable-land-mdpi**: 800×480px
- **drawable-land-hdpi**: 1280×800px
- **drawable-land-xhdpi**: 1920×1280px
- **drawable-land-xxhdpi**: 2560×1600px
- **drawable-land-xxxhdpi**: 3200×1920px

### Fallback
- **drawable**: 2732×2732px (universal fallback)

## Option 1: Automated Generation (Recommended)

### Using Capacitor Assets Generator

1. Install the tool:
```bash
npm install -g @capacitor/assets
```

2. Create a folder structure:
```bash
mkdir -p resources/splash
```

3. Create splash screens:
   - Create a high-resolution splash screen (2732×2732px minimum)
   - Place it at: `resources/splash.png`

4. Generate all sizes:
```bash
npx @capacitor/assets generate --android
```

### Using ImageMagick (Manual but Flexible)

If you have ImageMagick installed:

```bash
# Install ImageMagick first (if not installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Then run the generation script (see below)
```

## Option 2: Manual Creation

1. Open your logo in a design tool (Photoshop, Figma, Canva, etc.)

2. For each size listed above:
   - Create a canvas with the exact dimensions
   - Center your logo on a black (#000000) background
   - Export as PNG with the name `splash.png`
   - Save to the corresponding drawable folder

3. Folder locations:
```
android/app/src/main/res/
  ├── drawable/splash.png
  ├── drawable-port-mdpi/splash.png
  ├── drawable-port-hdpi/splash.png
  ├── drawable-port-xhdpi/splash.png
  ├── drawable-port-xxhdpi/splash.png
  ├── drawable-port-xxxhdpi/splash.png
  ├── drawable-land-mdpi/splash.png
  ├── drawable-land-hdpi/splash.png
  ├── drawable-land-xhdpi/splash.png
  ├── drawable-land-xxhdpi/splash.png
  └── drawable-land-xxxhdpi/splash.png
```

## Option 3: Quick Setup Script

I've created a script below that can help you generate the splash screens from a single source image.

Save this as `generate-splash.sh`:

```bash
#!/bin/bash

# Splash Screen Generator for Cuephoria Gaming
# Requires ImageMagick

SOURCE_IMAGE="splash-screen-base.png"
OUTPUT_DIR="android/app/src/main/res"
BACKGROUND_COLOR="#1a1a2e"  # Dark blue-purple matching your theme

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Install it with:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Source image not found: $SOURCE_IMAGE"
    echo "Please place your Cuephoria Gaming logo at: $SOURCE_IMAGE"
    exit 1
fi

echo "Generating splash screens..."

# Function to generate splash screen
generate_splash() {
    local width=$1
    local height=$2
    local output_path=$3
    
    mkdir -p "$(dirname "$output_path")"
    
    convert "$SOURCE_IMAGE" \
        -resize "${width}x${height}" \
        -gravity center \
        -background "$BACKGROUND_COLOR" \
        -extent "${width}x${height}" \
        "$output_path"
    
    echo "Generated: $output_path (${width}x${height})"
}

# Generate portrait splash screens
generate_splash 480 800 "$OUTPUT_DIR/drawable-port-mdpi/splash.png"
generate_splash 800 1280 "$OUTPUT_DIR/drawable-port-hdpi/splash.png"
generate_splash 1280 1920 "$OUTPUT_DIR/drawable-port-xhdpi/splash.png"
generate_splash 1600 2560 "$OUTPUT_DIR/drawable-port-xxhdpi/splash.png"
generate_splash 1920 3200 "$OUTPUT_DIR/drawable-port-xxxhdpi/splash.png"

# Generate landscape splash screens
generate_splash 800 480 "$OUTPUT_DIR/drawable-land-mdpi/splash.png"
generate_splash 1280 800 "$OUTPUT_DIR/drawable-land-hdpi/splash.png"
generate_splash 1920 1280 "$OUTPUT_DIR/drawable-land-xhdpi/splash.png"
generate_splash 2560 1600 "$OUTPUT_DIR/drawable-land-xxhdpi/splash.png"
generate_splash 3200 1920 "$OUTPUT_DIR/drawable-land-xxxhdpi/splash.png"

# Generate fallback
generate_splash 2732 2732 "$OUTPUT_DIR/drawable/splash.png"

echo "✅ All splash screens generated successfully!"
echo ""
echo "Next steps:"
echo "1. Review the generated images"
echo "2. Run: npm run android:sync"
echo "3. Build and test your app"
```

## Steps to Use the Script

1. Save your Cuephoria Gaming logo as `splash-screen-base.png` in the project root
2. Make the script executable:
```bash
chmod +x generate-splash.sh
```
3. Run the script:
```bash
./generate-splash.sh
```

## Customizing the Splash Screen

### Change Background Color
Edit `capacitor.config.ts`:
```typescript
backgroundColor: "#1a1a2e",  // Your preferred color
```

### Change Duration
```typescript
launchShowDuration: 3000,  // Show for 3 seconds instead
```

### Change Animation
```typescript
launchFadeOutDuration: 1000,  // Slower fade out
```

### Add Spinner (Loading Indicator)
```typescript
showSpinner: true,
androidSpinnerStyle: "large",
spinnerColor: "#ff00ff",  // Pink/purple to match your brand
```

## Testing the Splash Screen

1. Sync your changes:
```bash
npm run android:sync
```

2. Open in Android Studio:
```bash
npm run cap:open:android
```

3. Run on a device or emulator

4. The splash screen should appear when the app launches

## Design Tips for Your Logo

Since your logo has a neon aesthetic with gradient colors (pink/purple to cyan):

1. **Background**: Use a dark background (#1a1a2e or #000000) to make the neon glow pop
2. **Logo Size**: Keep the logo at about 60-70% of the screen width
3. **Safe Area**: Leave 20% padding on all sides
4. **Format**: PNG with transparency for the logo, placed on solid background
5. **Resolution**: Start with at least 3000×3000px for best quality

## Programmatic Control

If you need to show/hide the splash screen programmatically in your app:

```typescript
import { SplashScreen } from '@capacitor/splash-screen';

// Show the splash screen
await SplashScreen.show({
  showDuration: 2000,
  autoHide: true,
});

// Hide the splash screen
await SplashScreen.hide();
```

## Troubleshooting

### Splash Screen Not Showing
1. Make sure all splash.png files exist in the correct folders
2. Clean and rebuild: `cd android && ./gradlew clean`
3. Re-sync: `npm run android:sync`

### Wrong Size/Stretched
- Check `androidScaleType` in config (try "CENTER_INSIDE" or "FIT_CENTER")
- Verify image dimensions match the required sizes

### Colors Look Wrong
- Ensure PNGs are in sRGB color space
- Check the backgroundColor setting matches your design

## Additional Resources

- [Capacitor Splash Screen Plugin](https://capacitorjs.com/docs/apis/splash-screen)
- [Android Splash Screen Guide](https://developer.android.com/guide/topics/ui/splash-screen)
- [Image Asset Studio](https://developer.android.com/studio/write/image-asset-studio) (in Android Studio)

## Next Steps

1. ✅ Configuration is already set up
2. 📸 Add your splash screen images
3. 🔄 Run `npm run android:sync`
4. 🚀 Build and test!
