# ElevenLabs Agentic AI Integration Setup

This guide will help you set up the ElevenLabs webhook integration for automated booking creation.

## 📋 Prerequisites

- ElevenLabs account with Agentic AI access
- Your Cuephoria POS deployed on Vercel (or your hosting platform)
- Access to your Vercel deployment URL

## 🚀 Setup Steps

### 1. Deploy the Webhook Endpoints

The following endpoints have been created:
- **Booking Webhook**: `/api/webhooks/elevenlabs-booking`
- **Available Stations**: `/api/webhooks/available-stations` (optional helper)

Make sure these are deployed to your production environment.

### 2. Get Your Deployment URL

Your webhook URL will be:
```
https://your-domain.vercel.app/api/webhooks/elevenlabs-booking
```

Replace `your-domain.vercel.app` with your actual Vercel deployment URL.

### 3. Configure ElevenLabs Webhook Tool

1. Go to ElevenLabs Dashboard → **Tools** → **Add webhook tool**
2. Click **"JSON Mode"** 
3. Open the file `ELEVENLABS_WEBHOOK_CONFIG.json` in this repository
4. Copy the entire JSON content
5. **IMPORTANT**: Update the `url` field in the `api_schema` section:
   ```json
   "url": "https://your-actual-domain.vercel.app/api/webhooks/elevenlabs-booking"
   ```
6. Paste the JSON into the ElevenLabs JSON editor
7. Click **"Add tool"**

### 4. Test the Webhook

You can test the webhook with a sample request:

```json
{
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "customer_email": "john@example.com",
  "station_id": "your-station-id-here",
  "booking_date": "2025-01-20",
  "start_time": "14:00",
  "end_time": "15:00",
  "duration": 60,
  "notes": "Test booking from ElevenLabs"
}
```

## 📝 Webhook Request Format

### Required Fields:
- `customer_name` (string): Full name of the customer
- `customer_phone` (string): Phone number (will be normalized)
- `station_id` (string or array): Station ID(s) to book
- `booking_date` (string): Date in YYYY-MM-DD format
- `start_time` (string): Start time in HH:MM format (24-hour)
- `end_time` (string): End time in HH:MM format (24-hour)

### Optional Fields:
- `customer_email` (string): Customer email address
- `duration` (integer): Duration in minutes (defaults to 60)
- `notes` (string): Additional booking notes

### Example Request:
```json
{
  "customer_name": "Alice Smith",
  "customer_phone": "+91 98765 43210",
  "customer_email": "alice@example.com",
  "station_id": "abc123-def456-ghi789",
  "booking_date": "2025-01-20",
  "start_time": "16:00",
  "end_time": "17:00",
  "duration": 60,
  "notes": "Booking made via AI assistant"
}
```

### Example Response (Success):
```json
{
  "ok": true,
  "bookingId": "booking-uuid-here",
  "bookingIds": ["booking-uuid-1", "booking-uuid-2"],
  "message": "Booking created successfully",
  "booking": {
    "customer_name": "Alice Smith",
    "stations": ["PS5 Station 1"],
    "date": "2025-01-20",
    "time": "16:00 - 17:00",
    "duration": "60 minutes",
    "price": "₹300",
    "booking_ids": ["booking-uuid-1"]
  }
}
```

### Example Response (Error):
```json
{
  "ok": false,
  "error": "Missing required fields",
  "required": ["customer_name", "customer_phone", "station_id", "booking_date", "start_time", "end_time"]
}
```

## 🔍 Getting Station IDs

To get available station IDs, you can:

1. **Use the helper endpoint** (GET request):
   ```
   https://your-domain.vercel.app/api/webhooks/available-stations
   ```
   This returns a list of all stations with their IDs, names, types, and rates.

2. **Check your database** directly through Supabase dashboard

3. **Use the POS interface** to view station IDs

## 💡 Tips for AI Agent Configuration

When configuring your ElevenLabs agent:

1. **Provide context**: Tell the agent about available stations and their types (PS5, 8-Ball Pool, VR)
2. **Time format**: Emphasize that times must be in 24-hour format (HH:MM)
3. **Date format**: Dates must be in YYYY-MM-DD format
4. **Phone validation**: The system will normalize phone numbers automatically
5. **Multiple stations**: The agent can book multiple stations by passing an array of station IDs

## 🔒 Security Notes

- The webhook currently accepts requests from any origin (CORS enabled)
- For production, consider adding:
  - API key authentication
  - IP whitelisting
  - Request signing/verification

## 🐛 Troubleshooting

### Webhook not responding:
- Check that the endpoint is deployed
- Verify the URL is correct
- Check Vercel function logs

### Booking creation fails:
- Verify station IDs are correct
- Check date/time format matches requirements
- Ensure phone number is valid (at least 10 digits)

### Customer not found:
- The system automatically creates new customers if they don't exist
- Phone numbers are normalized (non-digits removed)

## 📞 Support

For issues or questions:
1. Check Vercel function logs
2. Review the webhook response for error details
3. Verify all required fields are provided

---

**Last Updated**: January 2025

