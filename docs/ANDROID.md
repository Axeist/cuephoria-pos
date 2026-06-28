# Android app (Google Play)

Capacitor wraps the web app for Android. **The Vercel web deploy is unchanged** — these steps only affect the `android/` native project and `capacitor.config.ts` (read at `cap sync` time, not by Vite).

## How it works (Play Store)

The Play build loads your **live production site** in a native WebView so `/api/*` auth and POS flows work. Set via `CAPACITOR_SERVER_URL` (defaults to `https://admin.cuephoria.in`, matching `APP_BASE_URL`, in the `:play` scripts below).

Without `CAPACITOR_SERVER_URL`, `android:sync` bundles `dist/` locally (legacy behavior; login via `/api` will not work on device).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run android:sync` | Build web + sync to Android (bundled `dist/`) |
| `npm run android:sync:play` | Sync for Play Store — WebView → production URL |
| `npm run android:run` | Sync + open Android Studio |
| `npm run android:build` | Debug APK |
| `npm run android:release` | Release AAB (unsigned unless keystore configured) |
| `npm run android:release:play` | **Play Store AAB** — production URL + signed if keystore present |

Output AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## First-time setup

1. Install [Android Studio](https://developer.android.com/studio) and SDK API 34
2. `npm install`
3. Optional: `./setup-android.sh`
4. Set `ANDROID_HOME` and `JAVA_HOME` (see [archive/BEGINNERS_GUIDE.md](./archive/BEGINNERS_GUIDE.md))

## Play Store signing

1. Create an upload keystore (store offline, never commit):

```bash
keytool -genkey -v -keystore ~/cuetronix-upload.keystore -alias cuetronix-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

2. Copy `android/keystore.properties.example` → `android/keystore.properties` and fill in paths/passwords.

3. Build:

```bash
npm run android:release:play
```

4. Upload `app-release.aab` to [Google Play Console](https://play.google.com/console) → Internal testing first.

Increment `versionCode` in `android/app/build.gradle` for every new upload.

## Store listing checklist

- Privacy policy: `https://admin.cuephoria.in/privacy` (or your `APP_BASE_URL` + `/privacy`)
- Package name: `com.cuephoria.pos` (immutable after create)
- Complete Data safety, content rating, screenshots

## Smoke test (release build on a real device)

- [ ] App opens production site (not blank)
- [ ] Cold start lands on `/app/login` (not marketing home)
- [ ] Email/password staff login
- [ ] Google sign-in opens **in-app** Custom Tab and returns to the app (not external Chrome)
- [ ] Google signup → `/app/signup/google` workspace picker
- [ ] POS dashboard + one checkout path
- [ ] Android back button

**Note:** Mobile login UI and OAuth ship with the **web deploy** (`src/` + `/api/auth/mobile/exchange`). Run `npm run android:sync:play` after pulling so the native project gets `@capacitor/browser` and the deep-link intent filter.

### Google OAuth on Android

1. User taps **Continue with Google** on `/app/login` or `/app/signup`
2. In-app Chrome Custom Tab (`@capacitor/browser`) opens Google OAuth
3. Server callback issues a short-lived mobile ticket → `/auth/app-complete?handoff=1`
4. Bridge page deep-links `com.cuephoria.pos://auth/complete?mt=...` back to the app
5. WebView calls `POST /api/auth/mobile/exchange` to set session cookies

Web `/login` and desktop OAuth are unchanged.

## Environment

| Variable | Where | Description |
|----------|-------|-------------|
| `CAPACITOR_SERVER_URL` | Shell when running `:play` scripts | Production origin, e.g. `https://admin.cuephoria.in` |

Not used by Vercel. See [ENVIRONMENT.md](./ENVIRONMENT.md).

## Historical guides

[archive/ANDROID_README.md](./archive/ANDROID_README.md), [ANDROID_DEPLOYMENT_GUIDE.md](./archive/ANDROID_DEPLOYMENT_GUIDE.md)
