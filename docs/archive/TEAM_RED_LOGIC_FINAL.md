# ✅ TEAM RED Logic - Final Implementation

## 🎯 Understanding

**TEAM RED = ONE PS5 Console with 4 Controllers (1-4)**

### Key Rules:
1. **If ANY controller (1, 2, 3, or 4) is booked → Hide ENTIRE TEAM RED**
2. **When SELECTING (no booking yet) → Show all controllers, but prevent selecting multiple**
3. **Time slots show as available only if the team is completely free**

---

## 📊 Scenarios

### Scenario 1: Controller 1 is Booked

**Setup:**
- Controller 1: Booked for 5-6 PM ❌
- Controllers 2, 3, 4: Free ✅

**Result:**
- ❌ **Time Slot (5-6 PM):** Shows as "Booked" (because Controller 1 is booked)
- ❌ **Step 3:** Controllers 1-4 (TEAM RED) are ALL hidden
- ✅ **Step 3:** Controllers 5-8 (TEAM BLUE) are shown

**Reason:** If ANY controller is booked, the entire console is in use, so hide the whole team.

---

### Scenario 2: Controllers 1 & 2 are Booked

**Setup:**
- Controllers 1, 2: Booked for 5-6 PM ❌
- Controllers 3, 4: Free ✅

**Result:**
- ❌ **Time Slot (5-6 PM):** Shows as "Booked"
- ❌ **Step 3:** Controllers 1-4 (TEAM RED) are ALL hidden
- ✅ **Step 3:** Controllers 5-8 (TEAM BLUE) are shown

**Reason:** Even though 3 & 4 are free, the console is in use (1 & 2 booked), so hide entire team.

---

### Scenario 3: Controllers 1, 2, 3 are Booked

**Setup:**
- Controllers 1, 2, 3: Booked for 5-6 PM ❌
- Controller 4: Free ✅

**Result:**
- ❌ **Time Slot (5-6 PM):** Shows as "Booked"
- ❌ **Step 3:** Controllers 1-4 (TEAM RED) are ALL hidden
- ✅ **Step 3:** Controllers 5-8 (TEAM BLUE) are shown

**Reason:** Console is in use, so hide entire team even though Controller 4 is free.

---

### Scenario 4: No Existing Booking (Selecting)

**Setup:**
- No controllers booked for 5-6 PM ✅

**User Actions:**
1. Select time: 5-6 PM
2. Go to Step 3

**Result:**
- ✅ **Time Slot (5-6 PM):** Shows as "Available"
- ✅ **Step 3:** Controllers 1-4 (TEAM RED) are ALL visible
- ✅ **Step 3:** Controllers 5-8 (TEAM BLUE) are ALL visible

**User Actions:**
3. Select Controller 1

**Result:**
- ✅ Controllers 2-4: Still visible (no booking yet, just selection)
- ❌ Cannot select Controllers 2-4 (error: "Cannot select multiple from TEAM RED")
- ✅ Can select Controller 5 (different team)

**Reason:** When selecting (not booking), show all options but prevent selecting multiple from same team.

---

## 🔧 Implementation Details

### 1. Time Slot Availability (`fetchAvailableSlots`)

```typescript
// Group PS5 stations by team
teamGroups.forEach((teamStationIds, teamName) => {
  // Check if ANY controller from this team is booked
  const anyBooked = teamStationIds.some(id => {
    return availabilityMap.get(id) === false; // Booked
  });
  
  if (anyBooked) {
    // If ANY controller is booked, mark ALL controllers from this team as unavailable
    teamStationIds.forEach(id => unavailableTeamStations.add(id));
  }
});

// Time slot is available only if at least one station is free
// (excluding team-blocked stations)
anyStationAvailable = availabilityData.some((item) => {
  if (station.type === 'ps5' && station.team_name) {
    // Station is available only if:
    // 1. It's marked as available in database
    // 2. No teammate is booked (not in unavailableTeamStations)
    return item.is_available && !unavailableTeamStations.has(item.station_id);
  }
  return item.is_available;
});
```

**Result:** Time slot shows as "booked" if ANY controller from a team is booked.

---

### 2. Station Filtering (`getAvailableStationsForSlot`)

```typescript
// For PS5 teams: if ANY controller from a team is booked, ALL controllers from that team are unavailable
teamGroups.forEach((teamStationIds, teamName) => {
  const anyBooked = teamStationIds.some(id => {
    return availabilityMap.get(id) === false; // Booked
  });
  
  if (anyBooked) {
    // If any controller is booked, mark ALL controllers from this team as unavailable
    teamStationIds.forEach(id => unavailableTeamStations.add(id));
  }
});

// Only return stations that are available (excluding team-blocked ones)
if (item.is_available && !unavailableTeamStations.has(item.station_id)) {
  availableStationIds.add(item.station_id);
}
```

**Result:** Step 3 hides entire team if ANY controller is booked.

---

### 3. Selection Prevention (`handleStationToggle`)

```typescript
// Prevent selecting multiple controllers from the same team
if (station.type === 'ps5' && station.team_name) {
  const selectedFromSameTeam = selectedStations.filter(selectedId => {
    const selectedStation = stations.find(s => s.id === selectedId);
    return selectedStation?.team_name === station.team_name;
  });
  
  if (selectedFromSameTeam.length > 0) {
    toast.error(`Cannot select multiple controllers from ${station.team_name}`);
    return;
  }
}
```

**Result:** When selecting, can see all controllers but cannot select multiple from same team.

---

### 4. Station Visibility (`StationSelector`)

```typescript
// Show all stations - only filter based on actual booking conflicts
const visibleStations = stations;
```

**Result:** All stations visible when selecting (not hiding teammates on selection).

---

## ✅ Summary

### Booking-Based Filtering:
- ✅ If Controller 1 booked → Hide Controllers 1-4 (entire TEAM RED)
- ✅ If Controllers 1 & 2 booked → Hide Controllers 1-4 (entire TEAM RED)
- ✅ If Controllers 1, 2, 3 booked → Hide Controllers 1-4 (entire TEAM RED)
- ✅ Time slot shows as "booked" if ANY controller from team is booked

### Selection Behavior:
- ✅ Show all controllers when selecting (no automatic hiding)
- ✅ Prevent selecting multiple from same team (error message)
- ✅ Allow selecting from different teams

**The logic is now correct: Hide entire team if ANY controller is booked!** 🎉
