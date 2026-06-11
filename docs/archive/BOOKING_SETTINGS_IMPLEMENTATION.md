# 🎯 Booking Settings Configuration System

## Overview

This implementation makes the public booking system fully configurable through a Settings page, allowing administrators to:

1. **Customize Event Names** - Change "IIM Event" to any event name
2. **Configure Event Descriptions** - Customize the event category description
3. **Manage Coupon Codes** - Add, edit, enable/disable, and remove coupons dynamically
4. **Remove Restrictions** - All game types (PS5, 8-Ball, VR) are now available for all booking types

---

## 📁 Files Created/Modified

### New Files Created:

1. **`/supabase/migrations/20260216100000_add_booking_settings.sql`**
   - Creates `booking_settings` table
   - Stores event names and coupon configurations
   - Includes RLS policies for public read, authenticated write

2. **`/src/components/settings/BookingSettings.tsx`**
   - New settings component for managing booking configurations
   - Event name/description editor
   - Coupon code manager (add, edit, enable/disable, delete)

### Files Modified:

3. **`/src/pages/Settings.tsx`**
   - Added "Booking Settings" tab
   - Imported and integrated BookingSettings component

4. **`/src/pages/PublicBooking.tsx`**
   - Fetches dynamic settings from database
   - Uses configurable event names throughout
   - Uses configurable coupons from database
   - Removed all PS5/8-Ball restrictions for event bookings

---

## 🗄️ Database Schema

### Table: `booking_settings`

```sql
CREATE TABLE booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Settings Keys:

#### 1. `event_name`
```json
{
  "name": "IIM Event",
  "description": "Choose VR (15m) or PS5 Gaming (30m)"
}
```

#### 2. `booking_coupons`
```json
[
  {
    "code": "CUEPHORIA20",
    "description": "20% off on all bookings",
    "discount_type": "percentage",
    "discount_value": 20,
    "enabled": true
  }
]
```

---

## ✨ Features

### 1. Configurable Event Names

**Before:**
- Event name was hardcoded as "IIM Event"
- Description was hardcoded as "Choose VR (15m) or PS5 Gaming (30m)"

**After:**
- Event name and description are fetched from database
- Can be changed in Settings → Booking Settings
- Updates appear immediately on public booking page

**Locations Updated:**
- Event category button
- Event selection label
- Event badge/pill
- Toast notifications
- All UI text referencing the event

---

### 2. Dynamic Coupon Management

**Before:**
```typescript
const allowedCoupons = [
  "CUEPHORIA20",
  "CUEPHORIA35",
  "HH99",
  "NIT35",
  "AAVEG50",
  "AXEIST",
  "TEST210198$",
  "GAMEINSIDER50",
];
```

**After:**
```typescript
// Fetched from database
const allowedCoupons = allowedCouponsFromDB.length > 0 
  ? allowedCouponsFromDB 
  : fallbackCoupons;
```

**Features:**
- ✅ Add new coupons on the fly
- ✅ Edit coupon descriptions
- ✅ Enable/disable coupons without deleting
- ✅ Set percentage or fixed amount discounts
- ✅ All existing coupons pre-filled in settings
- ✅ Changes apply immediately

---

### 3. Removed Booking Restrictions

**Before:**
```typescript
// 8-Ball was excluded from event bookings
stations.filter(s => s.type !== '8ball')
```

**After:**
```typescript
// All stations available for event bookings
stations.filter(s => s.category === 'nit_event' && s.event_enabled)
```

**What Changed:**
- ✅ PS5 gaming available for event bookings
- ✅ 8-Ball Pool available for event bookings
- ✅ VR available for event bookings
- ✅ No restrictions on game type selection

---

## 🎨 User Interface

### Settings Page - Booking Settings Tab

#### Event Category Settings Section:
```
┌─────────────────────────────────────────┐
│ 📅 Event Category Settings              │
├─────────────────────────────────────────┤
│ Event Name:                             │
│ [IIM Event_________________]            │
│                                         │
│ Event Description:                      │
│ [Choose VR (15m) or PS5 Gaming (30m)]  │
│ [_________________________________]     │
│                                         │
│ [Save Event Settings]                   │
└─────────────────────────────────────────┘
```

#### Coupon Codes Section:
```
┌─────────────────────────────────────────┐
│ 🎫 Coupon Codes                         │
├─────────────────────────────────────────┤
│ Active Coupons:                         │
│                                         │
│ ┌─ CUEPHORIA20 [Enabled] ─────────┐    │
│ │ Description: 20% off all bookings│    │
│ │ Type: Percentage  Value: 20      │    │
│ │ [Toggle] [Delete]                │    │
│ └──────────────────────────────────┘    │
│                                         │
│ Add New Coupon:                         │
│ Code: [__________] Value: [____]        │
│ Description: [___________________]      │
│ Type: [Percentage ▼]                    │
│ [+ Add Coupon]                          │
│                                         │
│ [Save All Coupon Changes]               │
└─────────────────────────────────────────┘
```

---

## 🚀 How to Use

### For Administrators:

#### Change Event Name:
1. Go to **Settings** page
2. Click **Booking Settings** tab
3. Edit **Event Name** field (e.g., "NIT Event", "College Fest")
4. Edit **Event Description** if needed
5. Click **Save Event Settings**
6. Changes appear immediately on public booking page

#### Add New Coupon:
1. Go to **Settings → Booking Settings**
2. Scroll to **Add New Coupon** section
3. Enter:
   - **Code**: e.g., "SUMMER50"
   - **Value**: e.g., "50"
   - **Type**: Percentage or Fixed Amount
   - **Description**: e.g., "Summer special discount"
4. Click **Add Coupon**
5. Click **Save All Coupon Changes**

#### Edit Existing Coupon:
1. Find coupon in **Active Coupons** list
2. Modify description, type, or value directly
3. Click **Save All Coupon Changes**

#### Disable Coupon:
1. Find coupon in **Active Coupons** list
2. Toggle the **Enable/Disable** switch
3. Click **Save All Coupon Changes**
4. Coupon won't be available for use but remains in database

#### Delete Coupon:
1. Find coupon in **Active Coupons** list
2. Click **Delete** button
3. Click **Save All Coupon Changes**

---

### For Customers (Public Booking):

#### Event Name Display:
- Event category button shows configured name (e.g., "IIM Event" or "NIT Event")
- Event description shows configured text
- All toasts and messages use configured name

#### Coupon Usage:
- Only **enabled** coupons are valid
- Disabled coupons return "Invalid coupon code" error
- Coupons work for regular bookings only (not event bookings)

---

## 🔧 Technical Details

### PublicBooking.tsx Changes:

#### 1. State Management:
```typescript
const [eventName, setEventName] = useState("IIM Event");
const [eventDescription, setEventDescription] = useState("Choose VR (15m) or PS5 Gaming (30m)");
const [allowedCouponsFromDB, setAllowedCouponsFromDB] = useState<string[]>([]);
```

#### 2. Fetch Settings on Mount:
```typescript
useEffect(() => {
  const fetchBookingSettings = async () => {
    // Fetch event name
    const { data: eventData } = await supabase
      .from('booking_settings')
      .select('setting_value')
      .eq('setting_key', 'event_name')
      .maybeSingle();

    // Fetch coupons
    const { data: couponsData } = await supabase
      .from('booking_settings')
      .select('setting_value')
      .eq('setting_key', 'booking_coupons')
      .maybeSingle();
    
    // Update state
  };

  fetchBookingSettings();
}, []);
```

#### 3. Dynamic Event Name Usage:
```typescript
// All UI text uses eventName variable
<span>{eventName}</span>
toast.info(`${eventName} selected!`);
```

#### 4. Dynamic Coupons:
```typescript
const allowedCoupons = allowedCouponsFromDB.length > 0 
  ? allowedCouponsFromDB 
  : fallbackCoupons;
```

---

## 📝 Default Coupons Pre-filled

The migration includes these coupons by default:

1. **CUEPHORIA20** - 20% off on all bookings
2. **CUEPHORIA35** - 35% off on all bookings
3. **HH99** - Happy hours special (99% off)
4. **NIT35** - NIT special discount (35% off)
5. **AAVEG50** - Aaveg event special (50% off)
6. **AXEIST** - Axeist special discount (50% off)
7. **TEST210198$** - Test discount code (20% off)
8. **GAMEINSIDER50** - Game Insider special (50% off)

All are enabled by default and can be edited/disabled/removed.

---

## ✅ Restrictions Removed

### Before:
```typescript
// 8-Ball excluded from event bookings
stations.filter(s => s.type !== '8ball')
```

### After:
```typescript
// All game types available
stations.filter(s => s.category === 'nit_event' && s.event_enabled)
```

**Impact:**
- Event bookings can now select **PS5**, **8-Ball**, or **VR**
- No game type restrictions
- All stations treated equally for event bookings

---

## 🔐 Security

### Row Level Security (RLS):

**Public Read:**
```sql
CREATE POLICY "booking_settings_public_read" ON booking_settings
  FOR SELECT
  TO PUBLIC
  USING (true);
```

**Authenticated Write:**
```sql
CREATE POLICY "booking_settings_admin_write" ON booking_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Result:**
- ✅ Anyone can read settings (for public booking)
- ✅ Only authenticated users can modify settings
- ✅ Settings are fetched dynamically on page load

---

## 🚀 Deployment Steps

### 1. Apply Database Migration:
```bash
cd /Users/cave/Downloads/cuephoria-pos

# Option A: Using Supabase CLI
npx supabase db push

# Option B: Manual SQL execution
# Copy contents of supabase/migrations/20260216100000_add_booking_settings.sql
# Run in Supabase SQL Editor
```

### 2. Build and Deploy:
```bash
npm run build
git add .
git commit -m "Add configurable booking settings system"
git push
```

### 3. Verify Deployment:
1. Go to Settings → Booking Settings
2. Verify event name and coupons are displayed
3. Make a test change
4. Check public booking page for changes

---

## 🧪 Testing Checklist

### Settings Page:
- [ ] "Booking Settings" tab appears
- [ ] Event name field shows "IIM Event"
- [ ] Event description field shows default text
- [ ] All 8 default coupons are listed
- [ ] Can add new coupon
- [ ] Can edit existing coupon
- [ ] Can enable/disable coupon
- [ ] Can delete coupon
- [ ] Save buttons work

### Public Booking Page:
- [ ] Event button shows configured name
- [ ] Event description shows configured text
- [ ] Toast messages use configured name
- [ ] All enabled coupons work
- [ ] Disabled coupons show "Invalid coupon code"
- [ ] PS5 available for event bookings
- [ ] 8-Ball available for event bookings
- [ ] VR available for event bookings
- [ ] No restrictions on game type selection

### Integration:
- [ ] Settings changes reflect immediately
- [ ] Hard refresh shows new values
- [ ] Coupon validation uses database values
- [ ] Event name appears in all UI locations

---

## 📊 Impact Summary

### Before Implementation:
- ❌ Event name hardcoded in 10+ locations
- ❌ Coupons hardcoded in array
- ❌ 8-Ball restricted from event bookings
- ❌ No way to add/edit coupons without code changes

### After Implementation:
- ✅ Event name configurable in Settings
- ✅ Coupons fully manageable in Settings
- ✅ All game types available for all bookings
- ✅ Real-time updates without deployment
- ✅ Admin-friendly interface
- ✅ All existing coupons preserved

---

## 🎯 Benefits

1. **No Code Changes Needed**
   - Add coupons via Settings UI
   - Change event names instantly
   - No deployment required for content changes

2. **Flexibility**
   - Support multiple events
   - Seasonal coupon campaigns
   - Test new coupons easily

3. **User-Friendly**
   - Intuitive Settings interface
   - Visual feedback (enabled/disabled badges)
   - Validation and error handling

4. **Scalable**
   - Easy to add new settings
   - Database-driven configuration
   - Supports future enhancements

---

## 🔮 Future Enhancements

Potential additions:

1. **Coupon Expiration Dates**
   - Add `valid_from` and `valid_until` fields
   - Auto-disable expired coupons

2. **Usage Limits**
   - Max uses per coupon
   - Per-customer limits

3. **Game-Specific Coupons**
   - Restrict coupons to specific game types
   - PS5-only or 8-Ball-only coupons

4. **Multiple Events**
   - Support multiple simultaneous events
   - Different pricing per event

5. **Coupon Analytics**
   - Track coupon usage
   - Most popular coupons
   - Revenue impact

---

## 📞 Support

If you encounter any issues:

1. Check Supabase logs for database errors
2. Verify migration was applied successfully
3. Check browser console for errors
4. Ensure authenticated user has proper permissions

---

## ✅ Summary

**What Was Done:**
1. ✅ Created database table for booking settings
2. ✅ Created BookingSettings component
3. ✅ Added Booking Settings tab to Settings page
4. ✅ Updated PublicBooking to use dynamic settings
5. ✅ Removed all game type restrictions
6. ✅ Pre-filled all existing coupons
7. ✅ Added documentation

**Result:**
A fully configurable booking system with admin-friendly management interface, no code changes needed for content updates, and complete flexibility for event names and coupon management.

---

**Status:** ✅ **COMPLETE AND READY TO DEPLOY**
