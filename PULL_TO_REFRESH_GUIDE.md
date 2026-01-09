# 📱 Pull-to-Refresh Integration Guide

Complete guide to adding pull-to-refresh functionality to your app pages.

---

## ✅ Component Created

The `PullToRefresh` component has been added at:
```
src/components/PullToRefresh.tsx
```

---

## 🎯 How to Use

### Basic Usage

Wrap your page content with the `PullToRefresh` component:

```tsx
import PullToRefresh from '@/components/PullToRefresh';

function MyPage() {
  const handleRefresh = async () => {
    // Your refresh logic here
    await fetchData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        {/* Your page content */}
      </div>
    </PullToRefresh>
  );
}
```

---

## 📚 Integration Examples

### Example 1: With React Query

Perfect for pages using `useQuery`:

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '@/components/PullToRefresh';

function DashboardPage() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });

  const handleRefresh = async () => {
    // Refetch all queries or specific ones
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4">
        {isLoading ? <Spinner /> : <DashboardContent data={data} />}
      </div>
    </PullToRefresh>
  );
}
```

### Example 2: With Context Data

For pages using Context API (like POSContext):

```tsx
import { usePOS } from '@/context/POSContext';
import PullToRefresh from '@/components/PullToRefresh';

function StationsPage() {
  const { stations, refreshStations } = usePOS();

  const handleRefresh = async () => {
    // Refresh context data
    await refreshStations();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4">
        {stations.map(station => (
          <StationCard key={station.id} station={station} />
        ))}
      </div>
    </PullToRefresh>
  );
}
```

### Example 3: With Multiple Data Sources

Refresh multiple data sources at once:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { usePOS } from '@/context/POSContext';
import PullToRefresh from '@/components/PullToRefresh';

function ReportsPage() {
  const queryClient = useQueryClient();
  const { refreshBills, refreshSessions } = usePOS();

  const handleRefresh = async () => {
    // Refresh multiple things in parallel
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      refreshBills(),
      refreshSessions(),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4">
        {/* Your reports content */}
      </div>
    </PullToRefresh>
  );
}
```

### Example 4: With Supabase

Direct Supabase data refresh:

```tsx
import { supabase } from '@/integrations/supabase/client';
import PullToRefresh from '@/components/PullToRefresh';
import { useState } from 'react';

function BookingsPage() {
  const [bookings, setBookings] = useState([]);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    setBookings(data || []);
  };

  const handleRefresh = async () => {
    await fetchBookings();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4">
        {bookings.map(booking => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </PullToRefresh>
  );
}
```

---

## 🎨 Features

### ✅ What's Included

- **Touch gesture detection** - Natural pull-down interaction
- **Visual feedback** - Rotating arrow icon and progress indicator
- **Smooth animations** - Fluid transitions and spring physics
- **Resistance curve** - Natural feeling pull resistance
- **Native platform only** - Automatically disabled on web
- **Loading state** - Shows spinner while refreshing
- **Threshold trigger** - Pull past 80px to trigger refresh

### 🎯 Smart Behavior

- **Only works on mobile** - Automatically disabled on web browsers
- **Top scroll only** - Only activates when scrolled to the top
- **Prevents over-refresh** - Can't trigger while already refreshing
- **Smooth cancellation** - Returns to position if not pulled enough

---

## 🔧 Configuration

### Props

```tsx
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;  // Required: Your refresh function
  children: ReactNode;              // Required: Your page content
  enabled?: boolean;                // Optional: Enable/disable (default: true)
}
```

### Customization

You can modify the component to adjust:

```tsx
// In PullToRefresh.tsx
const threshold = 80;   // Distance needed to trigger (pixels)
const maxPull = 120;    // Maximum pull distance (pixels)
```

---

## 📱 Recommended Pages to Add Pull-to-Refresh

### High Priority
- ✅ **Dashboard** - Refresh stats, charts, and active sessions
- ✅ **Stations** - Refresh station status and sessions
- ✅ **Bookings** - Refresh upcoming and active bookings
- ✅ **Reports** - Refresh sales and analytics data
- ✅ **Customers** - Refresh customer list

### Medium Priority
- ⚡ **Products** - Refresh inventory levels
- ⚡ **POS** - Refresh cart and pricing (be careful with cart state!)
- ⚡ **Staff Portal** - Refresh attendance and tasks

### Not Recommended
- ❌ **Settings** - Static content, no need to refresh
- ❌ **Login** - No data to refresh
- ❌ **Forms** - Could lose user input

---

## 🚀 Quick Integration Steps

1. **Import the component:**
   ```tsx
   import PullToRefresh from '@/components/PullToRefresh';
   ```

2. **Create refresh function:**
   ```tsx
   const handleRefresh = async () => {
     // Your refresh logic
   };
   ```

3. **Wrap your content:**
   ```tsx
   <PullToRefresh onRefresh={handleRefresh}>
     {/* Your existing content */}
   </PullToRefresh>
   ```

4. **Test on mobile:**
   - Build APK: `npm run android:build`
   - Install on device
   - Pull down from top of page

---

## 💡 Tips & Best Practices

### ✅ DO:
- Keep refresh logic fast (< 2 seconds ideal)
- Show toast notifications on error
- Use with React Query's `invalidateQueries`
- Test on actual device (not just emulator)
- Disable on pages with important form state

### ❌ DON'T:
- Don't use on pages with unsaved forms
- Don't refresh while user is actively typing
- Don't make multiple API calls unnecessarily
- Don't forget to handle errors
- Don't use on web (component auto-disables)

---

## 🐛 Troubleshooting

### Pull-to-refresh not working?

**Check 1:** Are you on mobile?
```tsx
// Component only works on native platforms
import { isNativePlatform } from '@/utils/capacitor';
console.log('Is native:', isNativePlatform());
```

**Check 2:** Is page scrolled to top?
- Pull-to-refresh only activates when scrolled to top of page

**Check 3:** Is container scrollable?
- Parent container needs `overflow-auto` or `overflow-scroll`

**Check 4:** Is enabled prop true?
```tsx
<PullToRefresh onRefresh={handleRefresh} enabled={true}>
```

### Refresh not triggering?

**Check refresh function:**
```tsx
const handleRefresh = async () => {
  console.log('Refresh triggered!');
  // Must return a Promise
  await yourRefreshLogic();
};
```

### Visual glitches?

**Check z-index conflicts:**
- Pull indicator uses `z-50`
- Make sure no elements have higher z-index

**Check container height:**
- Container needs defined height (e.g., `h-full`, `min-h-screen`)

---

## 📊 Example: Complete Dashboard Integration

```tsx
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useToast } from '@/hooks/use-toast';
import PullToRefresh from '@/components/PullToRefresh';
import DashboardStats from '@/components/dashboard/DashboardStats';
import SalesChart from '@/components/dashboard/SalesChart';

function Dashboard() {
  const queryClient = useQueryClient();
  const { refreshAll } = usePOS();
  const { refreshExpenses } = useExpenses();
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      // Refresh all data sources
      await Promise.all([
        queryClient.invalidateQueries(),
        refreshAll(),
        refreshExpenses(),
      ]);

      toast({
        title: 'Dashboard refreshed',
        description: 'All data has been updated',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Could not update data',
        variant: 'destructive',
      });
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DashboardStats />
        <SalesChart />
        {/* More dashboard content */}
      </div>
    </PullToRefresh>
  );
}

export default Dashboard;
```

---

## 🎯 Testing Checklist

Before deploying:

- [ ] Tested on Android device (not just browser)
- [ ] Pull-to-refresh triggers correctly
- [ ] Loading indicator shows while refreshing
- [ ] Can't trigger refresh while already refreshing
- [ ] Works when scrolled to top only
- [ ] Smooth animations and no jitter
- [ ] Data actually refreshes
- [ ] Error handling works
- [ ] Doesn't interfere with normal scrolling
- [ ] Disabled on web browser

---

## 🚀 Build & Test

1. **Rebuild your app:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. **Install on device:**
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Test:**
   - Open app on device
   - Navigate to a page with pull-to-refresh
   - Pull down from top of page
   - Should see rotating arrow and "Pull to refresh"
   - Pull past threshold and release
   - Should see spinner and "Refreshing..."
   - Data should refresh

---

## 📝 Summary

Pull-to-refresh is now available as a reusable component! Just:

1. Import `PullToRefresh`
2. Wrap your content
3. Pass your refresh logic
4. Build and test on mobile

**Works automatically on mobile, disabled on web!** 🎉

Need help? Check the examples above or ask for assistance!
