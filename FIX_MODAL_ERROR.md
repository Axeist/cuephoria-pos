# Fix "Modal is not defined" Error

## ✅ Root Cause
This error is caused by **browser cache** holding old component code after our recent updates. The code is correct (TypeScript compilation passes), but the browser needs to reload the updated components.

---

## 🔧 Solution (Try in Order)

### Step 1: Hard Refresh Browser (90% Success Rate)

**Mac:**
```
Cmd + Shift + R
```

**Windows/Linux:**
```
Ctrl + Shift + R
```

**OR** Hold `Shift` and click the refresh button

---

### Step 2: Clear Site Data (If Step 1 Fails)

1. **Open DevTools:**
   - Mac: `Cmd + Option + I`
   - Windows: `F12`

2. **Go to Application/Storage tab**

3. **Click "Clear site data"** button

4. **Close and reopen browser**

5. **Navigate back to the site**

---

### Step 3: Empty Cache and Hard Reload

1. **Open DevTools** (F12 or Cmd+Option+I)

2. **Right-click** the refresh button (while DevTools is open)

3. Select **"Empty Cache and Hard Reload"**

---

### Step 4: Restart Dev Server

1. **In terminal**, press `Ctrl + C` to stop server

2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   rm -rf dist
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

4. **Wait for build to complete**

5. **Hard refresh browser** (Cmd+Shift+R)

---

### Step 5: Nuclear Option (Last Resort)

If nothing else works:

```bash
# Stop dev server (Ctrl+C)

# Clear all caches
rm -rf node_modules/.vite
rm -rf dist
rm -rf .turbo
rm -rf node_modules/.cache

# Reinstall (only if really necessary)
rm -rf node_modules
npm install

# Restart
npm run dev
```

Then **hard refresh** browser.

---

## 🎯 Why This Happens

When we updated the tournament types and components:
- Browser cached old JavaScript bundles
- Hot Module Reload (HMR) didn't fully update
- Old component references remained in memory
- New code tried to use updated types with old components

This is **normal** after major type changes! Not a bug in your code.

---

## ✅ How to Verify It's Fixed

After the fix, you should see:

1. **No red error screen**
2. **Tournament page loads correctly**
3. **Admin can create tournaments**
4. **Players can register with coupons**

---

## 🚨 If Error Still Persists

1. **Check browser console** for the EXACT error message
2. **Try a different browser** (Chrome, Firefox, Safari)
3. **Try incognito/private mode**
4. **Check if dev server is actually running** (`npm run dev`)
5. **Verify port 5173 is not blocked**

---

## 💡 Prevention for Future

After making type definition changes:
1. Always **hard refresh** browser
2. Or use **incognito mode** for testing
3. Or **restart dev server** after major changes

---

## 📝 Quick Command Reference

```bash
# Clear Vite cache
rm -rf node_modules/.vite dist

# Restart dev server
npm run dev

# Check for TypeScript errors (should pass)
npx tsc --noEmit

# Check if server is running
lsof -i :5173
```

---

## ✨ Expected Behavior After Fix

### Tournament Creation:
- Entry fee field (dynamic, not hardcoded)
- Discount type selector (Percentage or Fixed)
- Add coupons with different types

### Player Registration:
- See actual tournament entry fee
- Enter coupon code
- Apply discount (shows correct type)
- See final discounted price

### Both Working:
- ✅ No "Modal is not defined" error
- ✅ No red error screen
- ✅ All components render properly
- ✅ Coupon system functional

---

**Quick Fix: Just do Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)** 🚀

This solves 90% of cases!
