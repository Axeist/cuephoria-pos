# Tournament Fee & Discount Coupon System Implementation

## Overview
This implementation makes the tournament entry fee configurable and adds a comprehensive discount coupon system that allows players to enter coupon codes during registration to receive percentage-based discounts.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20260216000000_add_tournament_fee_and_coupons.sql`

Added the following columns to the `tournaments` table:
- `entry_fee` (NUMERIC, default: 250) - Configurable tournament entry fee
- `discount_coupons` (JSONB, default: []) - Array of discount coupons

Updated `tournament_public_view` to include new fields.

Added the following columns to `tournament_public_registrations`:
- `coupon_code` (TEXT) - The coupon code used during registration
- `discount_percentage` (NUMERIC) - Percentage discount applied
- `original_fee` (NUMERIC) - Original entry fee before discount
- `final_fee` (NUMERIC) - Final fee after discount

### 2. Type Definitions
**File:** `src/types/tournament.types.ts`

- Added `DiscountCoupon` interface:
  ```typescript
  interface DiscountCoupon {
    code: string;
    discount_percentage: number;
    description?: string;
  }
  ```

- Updated `Tournament` interface to include:
  - `entryFee?: number` - Tournament entry fee
  - `discountCoupons?: DiscountCoupon[]` - Available discount coupons

- Updated conversion functions to handle new fields

### 3. Admin Tournament Management
**File:** `src/components/tournaments/TournamentDialog.tsx`

Added a new section for managing entry fees and discount coupons:

**Features:**
- Configurable entry fee input field (defaults to ₹250)
- Add/remove discount coupons with:
  - Coupon code (automatically converted to uppercase)
  - Discount percentage (1-100%)
  - Optional description
- Visual display of all active coupons
- Form validation for coupon creation

**UI Components:**
- Entry Fee input with ₹ symbol
- Discount Coupons section with:
  - List of existing coupons (shows code, percentage, and description)
  - "Add New Coupon" form with 3 input fields
  - Remove button (X) for each coupon
  - Counter showing total number of coupons

### 4. Public Tournament Registration
**File:** `src/pages/PublicTournaments.tsx`

#### Registration Form Enhancements:

**Coupon Code Input:**
- Only shows when tournament has available coupons
- Input field with "Apply" button
- Real-time validation
- Visual feedback:
  - Success: Green box showing applied coupon with discount percentage
  - Error: Red error message for invalid codes
  - Info: Shows list of available coupon codes below input

**Applied Coupon Display:**
- Shows coupon code, discount percentage
- Remove button (X) to clear coupon
- Green gradient background for visual emphasis

**Price Calculation:**
- `calculateFinalFee()` function computes:
  - Original fee
  - Discount percentage
  - Final fee after discount
- Updates in real-time when coupon is applied/removed

#### Tournament Card Display:
- Shows configurable entry fee instead of hardcoded ₹250
- Displays "X discount coupon(s) available" badge when coupons exist
- Ticket icon for visual indication

#### Payment Integration:

**For Razorpay (Online Payment):**
- Calculates final fee with discount before payment
- Includes coupon information in payment notes:
  - `original_fee`
  - `discount_percentage`
  - `coupon_code`
- Stores pending registration with coupon details

**For Venue Payment:**
- Saves coupon information to database:
  - `coupon_code`
  - `discount_percentage`
  - `original_fee`
  - `final_fee`

#### Registration Success:
- Shows final fee (after discount) in confirmation dialog
- Displays in registration receipt

### 5. Key Functions Added

```typescript
// Validate and apply coupon
handleApplyCoupon(): validates coupon code against tournament's available coupons

// Remove applied coupon
handleRemoveCoupon(): clears applied coupon and resets form

// Calculate final fee with discount
calculateFinalFee(baseFee, coupon): returns {originalFee, discount, finalFee}
```

## Usage Guide

### For Administrators (Tournament Creation):

1. Navigate to Tournament Management
2. Click "Create New Tournament"
3. Fill in basic information
4. In the "Registration Fee & Discounts" section:
   - Set the entry fee (default: ₹250)
   - Add discount coupons:
     - Enter coupon code (e.g., "SAVE20")
     - Enter discount percentage (e.g., 20 for 20% off)
     - Optional: Add description (e.g., "Early bird discount")
     - Click "Add Coupon"
   - Remove coupons by clicking the X button
5. Save the tournament

**Example Coupons:**
- `EARLYBIRD10` - 10% OFF - "Register before deadline"
- `STUDENT20` - 20% OFF - "For student players"
- `VIP50` - 50% OFF - "VIP member discount"

### For Players (Registration):

1. View available tournaments
2. Click "Register Now" on desired tournament
3. Fill in your details (name, phone, email)
4. **If coupons are available:**
   - You'll see "Discount Coupon (Optional)" field
   - Available coupon codes are listed below the input
   - Enter your coupon code
   - Click "Apply"
   - See the discount applied instantly
5. Choose payment method:
   - **Pay Online:** See discounted price before payment
   - **Pay at Venue:** Discount is recorded and shown at venue
6. Complete registration

**Example:**
- Entry Fee: ₹250
- Coupon: SAVE20 (20% OFF)
- **Final Price: ₹200** (saved ₹50)

## Database Schema Changes

### tournaments table:
```sql
entry_fee NUMERIC DEFAULT 250
discount_coupons JSONB DEFAULT '[]'::jsonb

-- Example discount_coupons value:
[
  {
    "code": "SAVE20",
    "discount_percentage": 20,
    "description": "20% discount"
  },
  {
    "code": "EARLYBIRD",
    "discount_percentage": 15,
    "description": "Early registration bonus"
  }
]
```

### tournament_public_registrations table:
```sql
coupon_code TEXT
discount_percentage NUMERIC
original_fee NUMERIC
final_fee NUMERIC

-- Example values:
-- coupon_code: "SAVE20"
-- discount_percentage: 20
-- original_fee: 250
-- final_fee: 200
```

## Migration Instructions

The database migration file has been created at:
`supabase/migrations/20260216000000_add_tournament_fee_and_coupons.sql`

To apply the migration:

**Option 1: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of the migration file
4. Execute the SQL

**Option 2: Supabase CLI (if linked)**
```bash
npx supabase db push
```

**Option 3: Direct SQL execution**
- Connect to your PostgreSQL database
- Execute the migration SQL file

## Testing Checklist

- [ ] Create a tournament with custom entry fee (e.g., ₹500)
- [ ] Add multiple discount coupons (e.g., SAVE10, SAVE20, SAVE30)
- [ ] Test tournament displays correct entry fee on public page
- [ ] Test valid coupon application (should show discount)
- [ ] Test invalid coupon application (should show error)
- [ ] Test removing applied coupon
- [ ] Test registration with coupon (online payment)
- [ ] Test registration with coupon (venue payment)
- [ ] Verify coupon details saved in database
- [ ] Verify correct final fee calculated and saved

## Benefits

1. **Flexibility:** Each tournament can have different entry fees
2. **Promotions:** Easy to run promotional campaigns with discount codes
3. **Tracking:** All coupon usage is tracked in the database
4. **User-Friendly:** Simple interface for both admins and players
5. **Transparency:** Players see exact discount before registration
6. **Revenue Insights:** Can analyze which coupons drive registrations

## Future Enhancements (Optional)

- Coupon usage limits (max redemptions)
- Coupon expiry dates
- Coupon types: percentage, fixed amount, free entry
- User-specific coupons
- Coupon usage analytics dashboard
- Automatic coupon application based on user segments
- Referral code system

## Notes

- Coupons are case-insensitive (automatically converted to uppercase)
- Discount percentage must be between 1-100
- Multiple coupons cannot be stacked (one per registration)
- Coupon is applied before payment gateway fees
- Original fee is always stored for audit purposes
- All monetary values are stored in the database for reporting

## Support

If you encounter any issues or need modifications:
1. Check browser console for error messages
2. Verify database migration was applied successfully
3. Confirm tournament has discount coupons configured
4. Test with different browsers/devices
