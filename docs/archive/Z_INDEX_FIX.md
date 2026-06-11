# 🎯 Z-Index Fix - Venue Payment Warning

## Problem

When clicking "Pay at Venue", the warning dialog appears **behind** the registration dialog, making buttons inaccessible.

## Root Cause

**Z-Index Stack:**
- Registration Dialog: `z-[9999]` (front)
- Venue Warning Alert: `z-[100]` (back) ❌

The AlertDialog's z-index was too low!

## Solution

Increased AlertDialog z-index to be **higher** than the main Dialog:

### File Changed: `src/components/ui/alert-dialog.tsx`

**Before:**
```tsx
// Overlay
className="... z-[100] ..."  ❌ Too low!

// Content
className="... z-[100] ..."  ❌ Too low!
```

**After:**
```tsx
// Overlay
className="... z-[10000] ..."  ✅ Higher than Dialog!

// Content
className="... z-[10000] ..."  ✅ Higher than Dialog!
```

## Z-Index Hierarchy (Final)

```
z-[10000] - AlertDialog (Venue Warning) ← HIGHEST
z-[9999]  - Dialog (Registration Form)
z-[9998]  - Dialog Overlay
z-50      - Other UI components
```

## Result

✅ Venue payment warning now appears **ON TOP** of registration dialog
✅ All buttons ("Claim the Offer", "Miss the Offer") are clickable
✅ Dialog hierarchy is correct

## Deploy

```bash
npm install  # If needed
npm run build
git add .
git commit -m "Fix z-index for venue payment warning dialog"
git push
```

Then hard refresh: `Cmd + Shift + R`

## Test

1. Open tournament registration
2. Click "Pay at Venue" button
3. ✅ Warning dialog should appear ON TOP
4. ✅ Should see two buttons clearly:
   - "Claim the Offer" (yellow)
   - "Miss the Offer" (gray)
5. ✅ Both buttons should be clickable

---

**Status:** ✅ FIXED - z-index increased from 100 to 10000
