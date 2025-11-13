# ElevenLabs Webhooks Setup Summary

## 📋 All Webhooks to Create

You need to create **4 webhooks** in ElevenLabs. Here's the complete list:

---

## 1. ✅ get_available_stations

**Purpose:** Get list of all gaming stations with their details

**Configuration:**
- **Name:** `get_available_stations`
- **Description:** `Retrieve a list of all available gaming stations with their IDs, names, types (PS5, 8-Ball Pool, VR), hourly rates, and current occupancy status`
- **Method:** `GET`
- **URL:** `https://admin.cuephoria.in/api/webhooks/available-stations`
- **Body Parameters:** None (GET request)
- **Headers:** None required

**Status:** ✅ Already created (working)

---

## 2. ✅ get_customer

**Purpose:** Fetch customer details by phone number

**Configuration:**
- **Name:** `get_customer`
- **Description:** `Fetch customer details by phone number. Returns customer information including name, email, membership status, loyalty points, booking history, and total spending. Use this to check if a customer exists before creating a booking.`
- **Method:** `POST`
- **URL:** `https://admin.cuephoria.in/api/webhooks/get-customer`
- **Body Parameters:**
  - `customer_phone` (string, required)
    - Description: `Customer phone number (10 digits, can include country code or formatting - will be normalized automatically)`
    - Value Type: `LLM Prompt`
- **Headers:**
  - `Content-Type`: `application/json`

**JSON Config File:** `ELEVENLABS_GET_CUSTOMER_CONFIG.json`

**Status:** ⚠️ Need to create

---

## 3. ✅ check_availability

**Purpose:** Check if stations are available for a specific date/time slot

**Configuration:**
- **Name:** `check_availability`
- **Description:** `Check if specific gaming stations are available for a requested date and time slot. This checks for existing bookings and active sessions to prevent double bookings.`
- **Method:** `POST`
- **URL:** `https://admin.cuephoria.in/api/webhooks/check-availability`
- **Body Parameters:**
  - `station_id` (string, required)
    - Description: `Station ID(s) to check. Can be a single station ID or comma-separated IDs for multiple stations (e.g., 'station-id-1,station-id-2')`
    - Value Type: `LLM Prompt`
  - `booking_date` (string, required)
    - Description: `Booking date in YYYY-MM-DD format (e.g., 2025-01-20)`
    - Value Type: `LLM Prompt`
  - `start_time` (string, required)
    - Description: `Start time in HH:MM format using 24-hour clock (e.g., 14:00 for 2:00 PM, 09:00 for 9:00 AM)`
    - Value Type: `LLM Prompt`
  - `end_time` (string, required)
    - Description: `End time in HH:MM format using 24-hour clock (e.g., 15:00 for 3:00 PM, 10:00 for 10:00 AM)`
    - Value Type: `LLM Prompt`
- **Headers:**
  - `Content-Type`: `application/json`

**JSON Config File:** `ELEVENLABS_CHECK_AVAILABILITY_CONFIG.json`

**Status:** ⚠️ Need to create

---

## 4. ✅ create_booking

**Purpose:** Create a gaming station booking

**Configuration:**
- **Name:** `create_booking`
- **Description:** `Create a gaming station booking at Cuephoria. Requires customer name, phone, station ID, date, and time slot.`
- **Method:** `POST`
- **URL:** `https://admin.cuephoria.in/api/webhooks/elevenlabs-booking`
- **Body Parameters:**
  - `customer_name` (string, required)
    - Description: `Full name of the customer making the booking`
    - Value Type: `LLM Prompt`
  - `customer_phone` (string, required)
    - Description: `Customer phone number (10 digits Indian number, can include country code or formatting - will be normalized automatically)`
    - Value Type: `LLM Prompt`
  - `station_id` (string, required)
    - Description: `Station ID to book. For multiple stations, make separate requests or pass comma-separated IDs`
    - Value Type: `LLM Prompt`
  - `booking_date` (string, required)
    - Description: `Booking date in YYYY-MM-DD format (e.g., 2025-01-15)`
    - Value Type: `LLM Prompt`
  - `start_time` (string, required)
    - Description: `Start time in HH:MM format (24-hour, e.g., 14:00 for 2:00 PM)`
    - Value Type: `LLM Prompt`
  - `end_time` (string, required)
    - Description: `End time in HH:MM format (24-hour, e.g., 15:00 for 3:00 PM)`
    - Value Type: `LLM Prompt`
  - `customer_email` (string, optional)
    - Description: `Customer email address (optional)`
    - Value Type: `LLM Prompt`
  - `duration` (integer, optional)
    - Description: `Duration in minutes (optional, defaults to 60 minutes)`
    - Value Type: `LLM Prompt`
  - `notes` (string, optional)
    - Description: `Additional notes for the booking (optional)`
    - Value Type: `LLM Prompt`
- **Headers:**
  - `Content-Type`: `application/json`

**JSON Config File:** `ELEVENLABS_WEBHOOK_CONFIG.json`

**Status:** ✅ Already created (working)

---

## 🚀 Quick Setup Steps

### For Each Webhook (except the ones already created):

1. **Go to ElevenLabs Dashboard** → **Tools** → **Add webhook tool**
2. **Click "JSON Mode"**
3. **Copy the JSON** from the corresponding config file:
   - `get_customer` → `ELEVENLABS_GET_CUSTOMER_CONFIG.json`
   - `check_availability` → `ELEVENLABS_CHECK_AVAILABILITY_CONFIG.json`
   - `create_booking` → `ELEVENLABS_WEBHOOK_CONFIG.json` (already done)
4. **Paste into JSON editor**
5. **Click "Add tool"**

### Or Use Form Mode:

1. **Go to ElevenLabs Dashboard** → **Tools** → **Add webhook tool**
2. **Use Form Mode** (not JSON Mode)
3. **Fill in the details** from the configuration above
4. **Add body parameters** one by one
5. **Click "Add tool"**

---

## 📊 Summary Table

| Webhook Name | Method | Status | Config File |
|-------------|--------|--------|-------------|
| `get_available_stations` | GET | ✅ Created | N/A (simple GET) |
| `get_customer` | POST | ⚠️ **Need to create** | `ELEVENLABS_GET_CUSTOMER_CONFIG.json` |
| `check_availability` | POST | ⚠️ **Need to create** | `ELEVENLABS_CHECK_AVAILABILITY_CONFIG.json` |
| `create_booking` | POST | ✅ Created | `ELEVENLABS_WEBHOOK_CONFIG.json` |

---

## ✅ Checklist

- [x] `get_available_stations` - Created and working
- [ ] `get_customer` - **Need to create**
- [ ] `check_availability` - **Need to create**
- [x] `create_booking` - Created and working

---

## 🎯 Next Steps

1. **Create `get_customer` webhook** using `ELEVENLABS_GET_CUSTOMER_CONFIG.json`
2. **Create `check_availability` webhook** using `ELEVENLABS_CHECK_AVAILABILITY_CONFIG.json`
3. **Add all 4 tools to your agent** in the agent settings
4. **Test the complete flow** with a booking request

---

## 📝 Notes

- All webhooks are deployed and ready at `https://admin.cuephoria.in/api/webhooks/`
- Phone numbers are automatically validated as 10-digit Indian numbers
- New customers are automatically created if they don't exist
- Availability is checked before creating bookings to prevent double bookings
- All endpoints support CORS and are ready for ElevenLabs integration

