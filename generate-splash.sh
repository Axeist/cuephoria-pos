#!/bin/bash

# Splash Screen Generator for Cuephoria Gaming
# Requires ImageMagick

SOURCE_IMAGE="splash-screen-base.png"
OUTPUT_DIR="android/app/src/main/res"
BACKGROUND_COLOR="#1a1a2e"  # Dark blue-purple matching your gaming theme

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Install it with:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Source image not found: $SOURCE_IMAGE"
    echo ""
    echo "Please save your Cuephoria Gaming logo as: $SOURCE_IMAGE"
    echo "The logo should be a high-resolution PNG (at least 3000x3000px)"
    exit 1
fi

echo "🎮 Cuephoria Gaming - Splash Screen Generator"
echo "=============================================="
echo ""
echo "Generating splash screens from: $SOURCE_IMAGE"
echo "Background color: $BACKGROUND_COLOR"
echo ""

# Function to generate splash screen
generate_splash() {
    local width=$1
    local height=$2
    local output_path=$3
    
    mkdir -p "$(dirname "$output_path")"
    
    # Create splash with logo centered on dark background
    convert "$SOURCE_IMAGE" \
        -resize "${width}x${height}" \
        -gravity center \
        -background "$BACKGROUND_COLOR" \
        -extent "${width}x${height}" \
        "$output_path"
    
    echo "✓ Generated: $output_path (${width}x${height})"
}

# Generate portrait splash screens
echo "📱 Generating Portrait Splash Screens..."
generate_splash 480 800 "$OUTPUT_DIR/drawable-port-mdpi/splash.png"
generate_splash 800 1280 "$OUTPUT_DIR/drawable-port-hdpi/splash.png"
generate_splash 1280 1920 "$OUTPUT_DIR/drawable-port-xhdpi/splash.png"
generate_splash 1600 2560 "$OUTPUT_DIR/drawable-port-xxhdpi/splash.png"
generate_splash 1920 3200 "$OUTPUT_DIR/drawable-port-xxxhdpi/splash.png"

echo ""
echo "🖥️  Generating Landscape Splash Screens..."
# Generate landscape splash screens
generate_splash 800 480 "$OUTPUT_DIR/drawable-land-mdpi/splash.png"
generate_splash 1280 800 "$OUTPUT_DIR/drawable-land-hdpi/splash.png"
generate_splash 1920 1280 "$OUTPUT_DIR/drawable-land-xhdpi/splash.png"
generate_splash 2560 1600 "$OUTPUT_DIR/drawable-land-xxhdpi/splash.png"
generate_splash 3200 1920 "$OUTPUT_DIR/drawable-land-xxxhdpi/splash.png"

echo ""
echo "🎯 Generating Fallback Splash Screen..."
# Generate fallback
generate_splash 2732 2732 "$OUTPUT_DIR/drawable/splash.png"

echo ""
echo "=============================================="
echo "✅ All splash screens generated successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the generated images in android/app/src/main/res/"
echo "   2. Run: npm run android:sync"
echo "   3. Open in Android Studio: npm run cap:open:android"
echo "   4. Test on a device or emulator"
echo ""
echo "🎨 To customize colors, edit the BACKGROUND_COLOR variable in this script"
echo ""
