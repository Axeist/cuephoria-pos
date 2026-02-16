# Discount Coupon System - Percentage & Fixed Amount Support

## Overview
The discount coupon system now supports **TWO types of discounts**:
1. **Percentage Discount** - e.g., 20% OFF, 50% OFF
2. **Fixed Amount Discount** - e.g., ₹50 OFF, ₹100 OFF

## Admin Interface - Creating Coupons

### Add New Coupon Form

```
┌──────────────────────────────────────────────────────────────────┐
│  Add New Coupon                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Coupon Code      Discount Type      Discount Value  Description │
│  ┌──────────┐    ┌──────────────┐   ┌────────────┐  ┌─────────┐│
│  │ SAVE20   │    │ Percentage % │   │ 20         │  │ 20% off ││
│  └──────────┘    └──────────────┘   └────────────┘  └─────────┘│
│                                                                   │
│  ┌──────────┐    ┌──────────────┐   ┌────────────┐  ┌─────────┐│
│  │ FLAT50   │    │ Fixed Amt ₹  │   │ 50         │  │ ₹50 off ││
│  └──────────┘    └──────────────┘   └────────────┘  └─────────┘│
│                                                                   │
│                    [➕ Add Coupon]                               │
└──────────────────────────────────────────────────────────────────┘
```

### Discount Type Dropdown Options:
1. **Percentage (%)** - Discount as a percentage of entry fee
2. **Fixed Amount (₹)** - Discount as a flat rupee amount

---

## Coupon Examples

### Percentage Discounts

#### Example 1: 20% OFF
```
Entry Fee: ₹250
Coupon: SAVE20 (20% OFF)
Discount: ₹50 (20% of 250)
Final Price: ₹200
```

#### Example 2: 50% OFF
```
Entry Fee: ₹500
Coupon: HALF50 (50% OFF)
Discount: ₹250 (50% of 500)
Final Price: ₹250
```

#### Example 3: 15% OFF
```
Entry Fee: ₹300
Coupon: EARLY15 (15% OFF)
Discount: ₹45 (15% of 300)
Final Price: ₹255
```

---

### Fixed Amount Discounts

#### Example 1: ₹50 OFF
```
Entry Fee: ₹250
Coupon: FLAT50 (₹50 OFF)
Discount: ₹50 (fixed)
Final Price: ₹200
```

#### Example 2: ₹100 OFF
```
Entry Fee: ₹500
Coupon: SAVE100 (₹100 OFF)
Discount: ₹100 (fixed)
Final Price: ₹400
```

#### Example 3: ₹25 OFF
```
Entry Fee: ₹150
Coupon: DISCOUNT25 (₹25 OFF)
Discount: ₹25 (fixed)
Final Price: ₹125
```

---

## When to Use Each Type

### Use **Percentage Discounts** When:
✅ You want the discount to scale with entry fee
✅ Running promotional campaigns (e.g., "20% OFF")
✅ Offering student/member discounts
✅ The discount should be proportional to the fee

**Examples:**
- Student discount: 30% OFF
- Early bird: 15% OFF
- VIP members: 50% OFF
- Special promotion: 25% OFF

---

### Use **Fixed Amount Discounts** When:
✅ You want a consistent discount regardless of entry fee
✅ Offering first-time registration bonuses
✅ Providing referral rewards
✅ Running flat discount promotions

**Examples:**
- First registration: ₹50 OFF
- Referral code: ₹100 OFF
- Festival special: ₹75 OFF
- Friend discount: ₹40 OFF

---

## Visual Display Examples

### Admin - Coupon List

```
┌────────────────────────────────────────────────────┐
│  Discount Coupons                    3 coupon(s)   │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  SAVE20        20% OFF                   ❌  │ │
│  │  Early bird discount                          │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  FLAT50        ₹50 OFF                   ❌  │ │
│  │  Flat discount for new users                  │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  STUDENT30     30% OFF                   ❌  │ │
│  │  For student players                          │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

### Player Registration - Applied Coupon

#### Percentage Coupon Applied
```
┌─────────────────────────────────────────────────┐
│  🎟️ SAVE20                              ❌     │
│  20% discount applied                           │
└─────────────────────────────────────────────────┘

Entry Fee
₹250  ₹200
      ^^^^^ 20% OFF
```

#### Fixed Amount Coupon Applied
```
┌─────────────────────────────────────────────────┐
│  🎟️ FLAT50                              ❌     │
│  ₹50 discount applied                           │
└─────────────────────────────────────────────────┘

Entry Fee
₹250  ₹200
      ^^^^^ ₹50 OFF
```

---

## Comparison Table

| Feature | Percentage Discount | Fixed Amount Discount |
|---------|--------------------|-----------------------|
| **Entry Fee: ₹200** | 20% = ₹40 OFF | ₹50 = ₹50 OFF |
| **Entry Fee: ₹500** | 20% = ₹100 OFF | ₹50 = ₹50 OFF |
| **Entry Fee: ₹1000** | 20% = ₹200 OFF | ₹50 = ₹50 OFF |
| **Scales with fee?** | ✅ Yes | ❌ No |
| **Predictable?** | ❌ No (varies) | ✅ Yes (fixed) |
| **Good for promotions?** | ✅ Yes | ✅ Yes |

---

## Smart Discount Protection

### Percentage Discounts
- **Maximum:** 100% (can't exceed 100%)
- **Result:** Final fee can go to ₹0 but not negative

### Fixed Amount Discounts
- **Protection:** Discount can't exceed entry fee
- **Example:** If entry fee is ₹200 and coupon is ₹300 OFF, discount is capped at ₹200
- **Result:** Final fee can go to ₹0 but not negative

---

## Database Structure

### Coupon Object
```json
{
  "code": "SAVE20",
  "discount_type": "percentage",
  "discount_value": 20,
  "description": "20% off for early birds"
}
```

```json
{
  "code": "FLAT50",
  "discount_type": "fixed",
  "discount_value": 50,
  "description": "₹50 off for new users"
}
```

### Registration Record
```sql
coupon_code: "SAVE20"
discount_type: "percentage"
discount_value: 20
discount_amount: 50        -- Calculated: 20% of 250
original_fee: 250
final_fee: 200
```

```sql
coupon_code: "FLAT50"
discount_type: "fixed"
discount_value: 50
discount_amount: 50        -- Fixed amount
original_fee: 250
final_fee: 200
```

---

## Use Case Scenarios

### Scenario 1: Variable Entry Fees with Percentage Discount

**Tournament A:**
- Entry Fee: ₹200
- Coupon: SAVE20 (20% OFF)
- Discount: ₹40
- Final: ₹160

**Tournament B:**
- Entry Fee: ₹500
- Same Coupon: SAVE20 (20% OFF)
- Discount: ₹100
- Final: ₹400

**✅ Benefit:** Same coupon code works across different tournaments with appropriate scaling

---

### Scenario 2: Consistent Discount with Fixed Amount

**Tournament A:**
- Entry Fee: ₹200
- Coupon: FLAT50 (₹50 OFF)
- Discount: ₹50
- Final: ₹150

**Tournament B:**
- Entry Fee: ₹500
- Same Coupon: FLAT50 (₹50 OFF)
- Discount: ₹50
- Final: ₹450

**✅ Benefit:** Predictable discount amount regardless of entry fee

---

### Scenario 3: Mixed Coupons for Same Tournament

**Tournament:** FIFA Championship (Entry Fee: ₹300)

**Available Coupons:**
1. EARLY20 (20% OFF) → ₹60 discount → Final: ₹240
2. STUDENT30 (30% OFF) → ₹90 discount → Final: ₹210
3. FLAT50 (₹50 OFF) → ₹50 discount → Final: ₹250
4. FIRST100 (₹100 OFF) → ₹100 discount → Final: ₹200

**Players can choose the best coupon for them!**

---

## Best Practices

### For Percentage Discounts:
1. **Common percentages:** 10%, 15%, 20%, 25%, 30%, 50%
2. **Student discounts:** 20-30%
3. **Early bird:** 10-15%
4. **VIP/Member:** 40-50%
5. **Promotional:** 25-30%

### For Fixed Amount Discounts:
1. **Round numbers:** ₹25, ₹50, ₹75, ₹100
2. **First-time users:** ₹50-₹100
3. **Referrals:** ₹75-₹150
4. **Small tournaments:** ₹25-₹50
5. **Large tournaments:** ₹100-₹200

---

## Validation Rules

### Percentage Discounts:
- ✅ Must be between 1-100
- ❌ Cannot exceed 100%
- ✅ Can result in ₹0 fee (100% OFF)

### Fixed Amount Discounts:
- ✅ Must be greater than 0
- ✅ No upper limit (capped at entry fee automatically)
- ✅ Can result in ₹0 fee if discount ≥ entry fee

---

## Migration Notes

### Updated Fields:
```sql
-- Old structure (percentage only)
discount_percentage: 20

-- New structure (both types)
discount_type: "percentage" | "fixed"
discount_value: 20  (percentage) or 50 (rupees)
discount_amount: 50  (actual rupees deducted)
```

### Backward Compatibility:
- Old `discount_percentage` field is still saved for percentage discounts
- New `discount_type` and `discount_value` fields support both types
- `discount_amount` always stores the actual rupee amount deducted

---

## Example Coupon Codes

### Percentage-Based:
- `SAVE10` - 10% OFF
- `SAVE20` - 20% OFF  
- `EARLY15` - 15% OFF
- `STUDENT30` - 30% OFF
- `VIP50` - 50% OFF
- `MEGA70` - 70% OFF
- `FREE100` - 100% OFF (free entry!)

### Fixed Amount-Based:
- `FLAT25` - ₹25 OFF
- `FLAT50` - ₹50 OFF
- `FLAT75` - ₹75 OFF
- `FLAT100` - ₹100 OFF
- `SAVE50` - ₹50 OFF
- `SAVE100` - ₹100 OFF
- `DISCOUNT50` - ₹50 OFF

---

## Testing Checklist

### Percentage Discounts:
- [ ] Create 20% OFF coupon
- [ ] Apply to ₹250 entry fee → Should be ₹200
- [ ] Apply to ₹500 entry fee → Should be ₹400
- [ ] Test 100% OFF → Should be ₹0
- [ ] Test maximum validation (can't exceed 100%)

### Fixed Amount Discounts:
- [ ] Create ₹50 OFF coupon
- [ ] Apply to ₹250 entry fee → Should be ₹200
- [ ] Apply to ₹500 entry fee → Should be ₹450
- [ ] Test coupon > fee (₹300 OFF on ₹200 fee) → Should be ₹0
- [ ] Verify minimum validation (must be > 0)

### Display:
- [ ] Check coupon list shows correct discount type
- [ ] Verify applied coupon shows correct format (% or ₹)
- [ ] Confirm payment info displays accurate savings
- [ ] Test mobile responsive view

---

## Support

**Common Questions:**

**Q: Can I create a 150% OFF coupon?**
A: No, percentage coupons are limited to 100% maximum.

**Q: What if fixed amount exceeds entry fee?**
A: The discount is automatically capped at the entry fee amount. Final fee will be ₹0.

**Q: Can players use multiple coupons?**
A: No, only one coupon can be applied per registration.

**Q: Which type is better?**
A: It depends! Use percentage for scalable discounts, use fixed for predictable amounts.

---

**Last Updated:** February 16, 2026
