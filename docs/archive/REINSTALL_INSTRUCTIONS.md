# 🔧 Fix Instructions - Dependencies Corrupted

## ✅ Root Cause Found!

The `node_modules` directory is corrupted (only contains xmlbuilder). This is why you're seeing the "Modal is not defined" error.

---

## 🚀 Quick Fix (Manual Steps Required)

### Step 1: Delete node_modules Folder

**In Finder/File Explorer:**
1. Navigate to `/Users/cave/Downloads/cuephoria-pos/`
2. Find the `node_modules` folder
3. **Move to Trash** (or delete it)
4. Also delete `package-lock.json` if it exists

**OR in Terminal:**
```bash
cd /Users/cave/Downloads/cuephoria-pos
rm -rf node_modules package-lock.json
```

If you get "Operation not permitted":
- Try deleting from Finder/File Explorer instead
- Or run: `sudo rm -rf node_modules package-lock.json` (requires password)

---

### Step 2: Reinstall Dependencies

```bash
npm install
```

This will take 1-2 minutes. Wait for it to complete.

---

### Step 3: Start Dev Server

```bash
npm run dev
```

---

### Step 4: Hard Refresh Browser

- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + R`

---

## ✅ Expected Output

After `npm install`, you should see:
```
added XXX packages in XXs
```

After `npm run dev`, you should see:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🎯 What Happened

During cache cleaning, `node_modules` got partially deleted but couldn't be fully removed due to file permissions. This left it in a corrupted state with only one package (xmlbuilder).

**Solution:** Complete reinstall of all dependencies.

---

## 🔍 Verify node_modules is Reinstalled

After `npm install`, check:
```bash
ls node_modules | wc -l
```

Should show **hundreds of packages**, not just 1.

---

## ✨ After Fix Works

You should be able to:
- ✅ Create tournaments with custom entry fees
- ✅ Add percentage discount coupons (20% OFF)
- ✅ Add fixed amount discount coupons (₹50 OFF)
- ✅ Players can apply coupons during registration
- ✅ See 3rd place prizes
- ✅ Add text-based rewards

---

## 🆘 If npm install Fails

### Error: Permission Denied
```bash
# Try with sudo (requires password)
sudo npm install
```

### Error: EACCES
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /Users/cave/Downloads/cuephoria-pos/node_modules
npm install
```

### Still Fails
1. Close all apps that might be using node_modules
2. Restart your computer
3. Try npm install again

---

## 💡 Alternative: Fresh Clone (If All Else Fails)

If you can't fix node_modules:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add tournament fees and coupon system"
   git push
   ```

2. **Clone fresh in new location:**
   ```bash
   cd ~/Downloads
   git clone [your-repo-url] cuephoria-pos-fresh
   cd cuephoria-pos-fresh
   npm install
   npm run dev
   ```

---

## 🎯 TL;DR - Do This:

1. **Delete** `node_modules` folder (Finder or `rm -rf node_modules`)
2. **Run** `npm install`
3. **Run** `npm run dev`
4. **Hard refresh** browser (`Cmd+Shift+R`)

That's it! ✅

---

**Note:** All your code changes are safe in the git files. The issue is only with node_modules, which is always safe to delete and reinstall.
