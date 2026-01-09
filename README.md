# Cuephoria POS - Point of Sale & Booking System

A comprehensive POS and management system for gaming cafes, with web and Android support.

## 📱 Now Available on Android!

This project has been converted to an Android app using Capacitor! 

**Quick Start:**
```bash
./setup-android.sh
```

**Documentation:**
- 🌟 **[START HERE - Beginners Guide](./BEGINNERS_GUIDE.md)** - Complete guide for non-developers
- 📱 **[Android README](./ANDROID_README.md)** - Android project overview
- ⚡ **[Quick Reference](./ANDROID_QUICK_REFERENCE.md)** - Commands cheat sheet
- 🚀 **[Deployment Guide](./ANDROID_DEPLOYMENT_GUIDE.md)** - Publishing to Play Store
- 📖 **[Full Summary](./ANDROID_CONVERSION_SUMMARY.md)** - Everything about the conversion

## Project info

**URL**: https://lovable.dev/projects/1a46da40-620c-4f55-9f80-b0b990917809

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1a46da40-620c-4f55-9f80-b0b990917809) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

### Web Application
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend)
- React Query (Data fetching)

### Android Application
- Capacitor (Native wrapper)
- Android SDK
- Native mobile features (haptics, status bar, splash screen)

## 📱 Android Features

The Android app includes:
- ✅ Native mobile experience
- ✅ Haptic feedback
- ✅ Custom splash screen
- ✅ Status bar theming
- ✅ Network status detection
- ✅ Keyboard management
- ✅ Error boundary with crash recovery
- ✅ Safe area insets for notched devices
- ✅ Android back button handling

### Building for Android

```bash
# Daily development
npm run android:run        # Build, sync, and open in Android Studio

# Testing
npm run android:build      # Build debug APK for testing

# Production
npm run android:release    # Build release AAB for Play Store
```

See [BEGINNERS_GUIDE.md](./BEGINNERS_GUIDE.md) for complete setup instructions.

## Cuephoria AI Setup

The application includes a chat bot powered by Google's Gemini AI. To enable this feature:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a `.env` file in the project root
3. Add the following line:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. Restart the development server

**Note**: The AI chat feature requires a Gemini API key. Without it, the chat will show an error message when trying to use the feature.

**Model Support**: The application tries multiple Gemini models automatically:
- `gemini-2.0-flash-exp` (default - latest and fastest)
- `gemini-1.5-flash` (fallback - fast and cost-effective)
- `gemini-1.5-pro` (fallback - more advanced capabilities)
- `gemini-pro` (legacy fallback)

The application will automatically try these models in order if one fails.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1a46da40-620c-4f55-9f80-b0b990917809) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
