# Third Prize & Text-Based Rewards Implementation

## Overview
This update adds support for **3rd place prizes** and **flexible text-based rewards** to the tournament system. You can now offer:
- Cash prizes for 1st, 2nd, and 3rd place
- Text-based rewards (e.g., "Free gold membership", "500 store credits", "Trophy + Medal")
- Combination of both cash and text rewards for each position

## What's New

### 1. Third Prize Support
- Added 3rd place prize fields (cash + text)
- 3rd place winner tracking
- Display 3rd place in completed tournaments

### 2. Text-Based Rewards
Each prize position (Winner, Runner-up, 3rd Place) now supports:
- **Cash Amount**: Numeric prize in ₹
- **Text Reward**: Any text description of non-monetary rewards

## Database Changes

### New Columns in `tournaments` table:

```sql
-- Third prize support
third_prize NUMERIC              -- Cash prize for 3rd place
third_place JSONB                -- 3rd place winner object

-- Text-based prizes for all positions
winner_prize_text TEXT           -- Text reward for winner
runner_up_prize_text TEXT        -- Text reward for runner-up  
third_prize_text TEXT            -- Text reward for 3rd place
```

### Migration File
`supabase/migrations/20260216000001_add_third_prize_and_text_prizes.sql`

## Admin Interface

### Tournament Creation/Edit Dialog

The **Budget & Prizes** section now has three separate prize cards:

#### 1st Place - Winner Prize (Yellow)
```
┌────────────────────────────────────────────────────┐
│ 🏆 1st Place - Winner Prize                        │
├────────────────────────────────────────────────────┤
│ Cash Amount (₹)          Additional Reward         │
│ ┌─────────────┐         ┌────────────────────────┐│
│ │ 5000        │         │ Free gold membership   ││
│ └─────────────┘         └────────────────────────┘│
└────────────────────────────────────────────────────┘
```

#### 2nd Place - Runner-up Prize (Gray)
```
┌────────────────────────────────────────────────────┐
│ 🥈 2nd Place - Runner-up Prize                     │
├────────────────────────────────────────────────────┤
│ Cash Amount (₹)          Additional Reward         │
│ ┌─────────────┐         ┌────────────────────────┐│
│ │ 2000        │         │ 500 store credits      ││
│ └─────────────┘         └────────────────────────┘│
└────────────────────────────────────────────────────┘
```

#### 3rd Place - Third Prize (Orange)
```
┌────────────────────────────────────────────────────┐
│ 🥉 3rd Place - Third Prize                         │
├────────────────────────────────────────────────────┤
│ Cash Amount (₹)          Additional Reward         │
│ ┌─────────────┐         ┌────────────────────────┐│
│ │ 1000        │         │ 250 store credits      ││
│ └─────────────┘         └────────────────────────┘│
└────────────────────────────────────────────────────┘
```

### Features:
- **Color-coded** sections for easy identification
- **Separate fields** for cash and text rewards
- **Optional fields** - you can use cash, text, or both
- **Helpful tip** at the bottom with usage suggestions

## Public Tournament Display

### Prize Pool Display (Before Tournament Starts)

The prize pool now shows all three positions with proper formatting:

```
┌─────────────────────────────────────────────────┐
│ ⭐ Prize Pool                                   │
├─────────────────────────────────────────────────┤
│ 👑 Winner: ₹5,000 + Free gold membership       │
│ 🥈 Runner-up: ₹2,000 + 500 store credits       │
│ 🥉 3rd Place: ₹1,000 + 250 store credits       │
└─────────────────────────────────────────────────┘
```

### Completed Tournament Display

Shows all three winners:

```
┌─────────────────────────────────────────────────┐
│ 🏆 Champion: John Doe                           │
│ 🥈 Runner-up: Jane Smith                        │
│ 🥉 3rd Place: Mike Johnson                      │
└─────────────────────────────────────────────────┘
```

## Example Use Cases

### Example 1: Cash Only Prizes
```
Winner:    ₹5,000
Runner-up: ₹2,000
3rd Place: ₹1,000
```

**Display:**
- Winner: ₹5,000
- Runner-up: ₹2,000
- 3rd Place: ₹1,000

---

### Example 2: Text Only Rewards
```
Winner:    Free gold membership for 1 year
Runner-up: 500 store credits
3rd Place: 250 store credits
```

**Display:**
- Winner: Free gold membership for 1 year
- Runner-up: 500 store credits
- 3rd Place: 250 store credits

---

### Example 3: Mixed (Cash + Text)
```
Winner:    ₹5,000 + Trophy + Gold membership
Runner-up: ₹2,000 + Medal + 500 store credits
3rd Place: ₹1,000 + Badge + 250 store credits
```

**Display:**
- Winner: ₹5,000 + Trophy + Gold membership
- Runner-up: ₹2,000 + Medal + 500 store credits
- 3rd Place: ₹1,000 + Badge + 250 store credits

---

### Example 4: Only Winner Has Cash, Others Get Credits
```
Winner:    ₹10,000
Runner-up: 1000 store credits + Premium access
3rd Place: 500 store credits
```

**Display:**
- Winner: ₹10,000
- Runner-up: 1000 store credits + Premium access
- 3rd Place: 500 store credits

---

## Popular Text Reward Ideas

### Membership & Access
- "Free gold membership for 6 months"
- "VIP access for 3 months"
- "Premium membership upgrade"
- "Lifetime member status"

### Store Credits
- "500 store credits"
- "₹1000 worth of credits"
- "Free gaming session voucher"
- "10 hour gaming pass"

### Physical Prizes
- "Trophy + Medal"
- "Gaming headset"
- "Gift hamper"
- "Exclusive merchandise"

### Experience Rewards
- "Free tournament entry next time"
- "Priority booking for 1 month"
- "Meet & greet with pro players"
- "Training session with coach"

### Combo Rewards
- "Trophy + 500 credits + Badge"
- "Medal + Free session + Merch"
- "Certificate + Store credits"

## Type Definitions Updated

```typescript
interface Tournament {
  // ... existing fields ...
  
  // Third place winner
  thirdPlace?: Player;
  
  // Cash prizes
  winnerPrize?: number;
  runnerUpPrize?: number;
  thirdPrize?: number;           // NEW
  
  // Text-based rewards
  winnerPrizeText?: string;      // NEW
  runnerUpPrizeText?: string;    // NEW
  thirdPrizeText?: string;       // NEW
}
```

## Migration Instructions

### Apply the Database Migration:

**Option 1: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of:
   - `supabase/migrations/20260216000000_add_tournament_fee_and_coupons.sql` (previous migration)
   - `supabase/migrations/20260216000001_add_third_prize_and_text_prizes.sql` (new migration)
4. Execute both SQL files in order

**Option 2: Supabase CLI**
```bash
npx supabase db push
```

**Option 3: Direct Database Connection**
- Connect to your PostgreSQL database
- Execute both migration SQL files

## Benefits

### 1. Flexibility
✅ Support any type of reward (cash, text, or both)
✅ No limitations on what you can offer
✅ Easy to add non-monetary incentives

### 2. Better Engagement
✅ Third place recognition encourages more participation
✅ Creative rewards attract diverse participants
✅ Mix of prizes appeals to different motivations

### 3. Cost Management
✅ Offer valuable rewards without high cash prizes
✅ Use store credits to drive business
✅ Memberships create long-term customers

### 4. Marketing Opportunities
✅ Showcase unique rewards in promotions
✅ Build brand loyalty with memberships
✅ Create buzz with creative prizes

## Testing Checklist

- [ ] Create tournament with cash prizes only
- [ ] Create tournament with text rewards only
- [ ] Create tournament with mixed prizes (cash + text)
- [ ] Create tournament with 3rd place prize
- [ ] Verify prizes display correctly on public page
- [ ] Complete a tournament and verify all three winners display
- [ ] Test with very long text rewards (check UI wrapping)
- [ ] Verify total prize pool calculation includes 3rd place
- [ ] Check mobile responsive display of prizes
- [ ] Test editing existing tournaments with new fields

## UI Changes Summary

### Admin Dialog
- Reorganized **Budget & Prizes** section
- Three separate prize cards (1st, 2nd, 3rd)
- Each card has cash + text fields
- Color-coded for easy identification
- Added helpful tips

### Public Tournament Page
- Updated prize pool display to show 3rd place
- Flexible display for cash/text/both
- Enhanced completed tournament winner display
- Updated stats to include 3rd place prizes

## Best Practices

### 1. Prize Structure
✅ Make winner prize significantly higher than others
✅ Keep runner-up and 3rd place prizes meaningful
✅ Consider using credits/memberships for lower positions

### 2. Text Descriptions
✅ Be specific: "500 store credits" not "some credits"
✅ Include duration for memberships: "Gold membership for 6 months"
✅ List all items for combo rewards: "Trophy + Medal + 500 credits"

### 3. Consistency
✅ Use consistent formatting across tournaments
✅ Keep reward values appropriate for entry fees
✅ Balance cash and non-cash rewards

### 4. Communication
✅ Clearly state what text rewards mean
✅ Explain redemption process if needed
✅ Set expectations for when rewards are given

## Examples by Tournament Type

### High-Stakes Championship
```
Entry Fee: ₹500
Winner:    ₹10,000 + Trophy + Gold membership (1 year)
Runner-up: ₹5,000 + Medal + 1000 store credits
3rd Place: ₹2,000 + 500 store credits
```

### Casual Weekly Tournament
```
Entry Fee: ₹150
Winner:    ₹1,000 + Free 10-hour pass
Runner-up: 500 store credits
3rd Place: 250 store credits
```

### Sponsored Corporate Event
```
Entry Fee: Free
Winner:    Gaming laptop + Trophy
Runner-up: Gaming headset + Merchandise
3rd Place: Merchandise bundle
```

### Beginner-Friendly Tournament
```
Entry Fee: ₹100
Winner:    ₹500 + Free gold membership (3 months)
Runner-up: 300 store credits + Badge
3rd Place: 150 store credits
```

## Future Enhancements (Optional Ideas)

- [ ] Support for 4th place and beyond
- [ ] Prize images/thumbnails
- [ ] Automatic prize notification system
- [ ] Prize claim tracking
- [ ] Prize redemption workflow
- [ ] Prize value analytics
- [ ] Custom prize categories (Most Kills, Best Defense, etc.)
- [ ] Team-based prize distribution

## Notes

- All prizes are **optional** - you can leave them blank
- Text rewards have **no character limit** (but keep them readable!)
- Old tournaments without 3rd place will continue to work normally
- You can **mix and match** - some positions with cash, some with text
- Total prize pool in stats only counts **cash prizes** (text rewards excluded)

## Support

If you have questions or need help:
1. Check this documentation
2. Review the example use cases
3. Test in a development environment first
4. Verify database migration was applied successfully

---

**Last Updated:** February 16, 2026
**Migration Files:**
- `20260216000000_add_tournament_fee_and_coupons.sql`
- `20260216000001_add_third_prize_and_text_prizes.sql`
