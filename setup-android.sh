#!/bin/bash

# Cuephoria POS - Android Setup Script
# This script automates the Android app setup process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║   Cuephoria POS - Android Setup Script      ║"
echo "║   Setting up your Android app...             ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print status messages
print_status() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Please run this script from the project root."
    exit 1
fi

print_success "Found project directory"

# Step 1: Check Node.js installation
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed! Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Step 2: Check npm installation
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi
print_success "npm found: $(npm --version)"

# Step 3: Install dependencies
print_status "Installing project dependencies..."
npm install
print_success "Dependencies installed"

# Step 4: Check if Capacitor is already initialized
if [ -f "capacitor.config.ts" ]; then
    print_success "Capacitor already configured"
else
    print_status "Initializing Capacitor..."
    npx cap init "Cuephoria POS" "com.cuephoria.pos" --web-dir=dist
    print_success "Capacitor initialized"
fi

# Step 5: Build the web app
print_status "Building web app..."
npm run build
print_success "Web app built successfully"

# Step 6: Check if Android platform exists
if [ -d "android" ]; then
    print_warning "Android platform already exists. Syncing..."
    npx cap sync android
    print_success "Android platform synced"
else
    print_status "Adding Android platform..."
    npx cap add android
    print_success "Android platform added"
    
    print_status "Syncing to Android..."
    npx cap sync android
    print_success "Synced to Android"
fi

# Step 7: Check for Android Studio
print_status "Checking for Android Studio..."
if [ -d "/Applications/Android Studio.app" ]; then
    print_success "Android Studio found"
else
    print_warning "Android Studio not found!"
    echo ""
    echo "Please install Android Studio from:"
    echo "https://developer.android.com/studio"
    echo ""
    read -p "Press Enter once Android Studio is installed, or Ctrl+C to exit..."
fi

# Step 8: Check Android SDK
print_status "Checking Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    print_warning "ANDROID_HOME not set!"
    echo ""
    echo "Run the following commands to set up your environment:"
    echo ""
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin"
    echo "export JAVA_HOME=\"/Applications/Android Studio.app/Contents/jbr/Contents/Home\""
    echo "export PATH=\$PATH:\$JAVA_HOME/bin"
    echo ""
    echo "Add these to your ~/.zshrc file and run: source ~/.zshrc"
    echo ""
else
    print_success "ANDROID_HOME is set: $ANDROID_HOME"
fi

# Step 9: Check adb
if command -v adb &> /dev/null; then
    print_success "adb found: $(adb --version | head -n 1)"
    
    # Check for connected devices
    print_status "Checking for connected Android devices..."
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
    if [ $DEVICES -gt 0 ]; then
        print_success "Found $DEVICES connected device(s)"
        adb devices
    else
        print_warning "No Android devices connected"
        echo "Connect your Android phone and enable USB debugging"
    fi
else
    print_warning "adb not found. Make sure Android SDK is properly installed."
fi

# Final success message
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════╗"
echo "║         Setup Complete! 🎉                   ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Open Android Studio:"
echo -e "   ${BLUE}npx cap open android${NC}"
echo ""
echo "2. Wait for Gradle sync to complete"
echo ""
echo "3. Click the green Play button (▶) to run on device/emulator"
echo ""
echo "Useful commands:"
echo -e "  ${BLUE}npm run android:run${NC}      - Build and open in Android Studio"
echo -e "  ${BLUE}npm run android:sync${NC}     - Sync web changes to Android"
echo -e "  ${BLUE}npm run android:build${NC}    - Build APK for testing"
echo ""
echo "For detailed instructions, see:"
echo -e "  ${BLUE}BEGINNERS_GUIDE.md${NC}"
echo -e "  ${BLUE}ANDROID_SETUP_GUIDE.md${NC}"
echo ""
