# 🎁 How to Add Customer Offers Management to Admin Panel

## Quick Integration Guide

The `CustomerOffersManagement` component has been created but needs to be integrated into your admin panel. Here's how:

---

## 📍 Option 1: Add to Customers Page (Recommended)

**File:** `src/pages/Customers.tsx`

### Step 1: Import the Component

Add this import at the top of `Customers.tsx`:

```typescript
import CustomerOffersManagement from '@/components/admin/CustomerOffersManagement';
```

### Step 2: Add State for Dialog

Add this state near other state declarations:

```typescript
const [showOffersManagement, setShowOffersManagement] = useState(false);
```

### Step 3: Add Button to Open Dialog

Add this button somewhere in your Customers page (e.g., next to "Add Customer" button):

```typescript
<Button
  onClick={() => setShowOffersManagement(true)}
  className="bg-cuephoria-orange hover:bg-cuephoria-orange/80"
>
  <Gift className="mr-2 h-4 w-4" />
  Manage Customer Offers
</Button>
```

### Step 4: Add the Dialog Component

Add this at the end of your JSX (before the closing tag):

```typescript
<CustomerOffersManagement
  isOpen={showOffersManagement}
  onClose={() => setShowOffersManagement(false)}
/>
```

### Complete Example:

```typescript
import CustomerOffersManagement from '@/components/admin/CustomerOffersManagement';
import { Gift } from 'lucide-react';

export default function Customers() {
  const [showOffersManagement, setShowOffersManagement] = useState(false);
  
  // ... existing code ...
  
  return (
    <div>
      {/* Header with buttons */}
      <div className="flex gap-2">
        <Button onClick={handleAddCustomer}>
          Add Customer
        </Button>
        
        <Button
          onClick={() => setShowOffersManagement(true)}
          className="bg-cuephoria-orange hover:bg-cuephoria-orange/80"
        >
          <Gift className="mr-2 h-4 w-4" />
          Manage Offers
        </Button>
      </div>
      
      {/* ... rest of your customers page ... */}
      
      {/* Add at the end */}
      <CustomerOffersManagement
        isOpen={showOffersManagement}
        onClose={() => setShowOffersManagement(false)}
      />
    </div>
  );
}
```

---

## 📍 Option 2: Add to Settings Page

**File:** `src/pages/Settings.tsx`

Same steps as above, but add the button in the Settings page under a "Marketing" or "Customer Management" section.

---

## 📍 Option 3: Create Dedicated Marketing Page

Create a new page for marketing/offers management:

**File:** `src/pages/Marketing.tsx`

```typescript
import React, { useState } from 'react';
import CustomerOffersManagement from '@/components/admin/CustomerOffersManagement';
import { Button } from '@/components/ui/button';
import { Gift, TrendingUp, Users } from 'lucide-react';

export default function Marketing() {
  const [showOffersDialog, setShowOffersDialog] = useState(false);
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Marketing & Promotions</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer" onClick={() => setShowOffersDialog(true)}>
          <CardContent className="p-6">
            <Gift className="h-12 w-12 text-cuephoria-orange mb-4" />
            <h3 className="text-xl font-semibold">Customer Offers</h3>
            <p className="text-gray-400 text-sm">Manage exclusive deals</p>
          </CardContent>
        </Card>
        
        {/* Add more marketing features here */}
      </div>
      
      <CustomerOffersManagement
        isOpen={showOffersDialog}
        onClose={() => setShowOffersDialog(false)}
      />
    </div>
  );
}
```

Then add route in `App.tsx`:

```typescript
import Marketing from "./pages/Marketing";

// In routes section:
<Route
  path="/marketing"
  element={
    <ProtectedRoute requireAdmin={true}>
      <Marketing />
    </ProtectedRoute>
  }
/>
```

---

## 🎯 Quick Test

After integration:

1. Login as **Admin**
2. Navigate to where you added the button
3. Click **"Manage Customer Offers"** or **"Manage Offers"**
4. Dialog should open
5. Click **"Create New Offer"**
6. Fill in details and save
7. Offer should appear in the list

---

## 🎨 Styling the Button

### Orange Theme (Recommended for Offers):
```typescript
<Button className="bg-cuephoria-orange hover:bg-cuephoria-orange/80">
  <Gift className="mr-2 h-4 w-4" />
  Manage Offers
</Button>
```

### Purple Theme:
```typescript
<Button className="bg-cuephoria-purple hover:bg-cuephoria-purple/80">
  <Gift className="mr-2 h-4 w-4" />
  Manage Offers
</Button>
```

### Outline Style:
```typescript
<Button variant="outline" className="border-cuephoria-orange text-cuephoria-orange">
  <Gift className="mr-2 h-4 w-4" />
  Manage Offers
</Button>
```

---

## 📱 Mobile Responsive

The dialog is already mobile-responsive, but if you want a mobile-friendly button:

```typescript
<Button
  onClick={() => setShowOffersManagement(true)}
  className={cn(
    "bg-cuephoria-orange hover:bg-cuephoria-orange/80",
    isMobile ? "w-full" : "w-auto"
  )}
>
  <Gift className="mr-2 h-4 w-4" />
  {isMobile ? "Offers" : "Manage Customer Offers"}
</Button>
```

---

## ✅ That's It!

Choose the option that best fits your current admin layout and add the component. The offers management system is fully functional and ready to use!
