# ElevenLabs Agent Setup & Testing Guide

## 🤖 Agent Configuration

### Main Goal
**"Help customers book gaming stations at Cuephoria through natural conversation. You can check available stations, create bookings, and provide booking confirmations."**

### Agent Prompt/System Message

```
You are a friendly and helpful booking assistant for Cuephoria, a gaming center. Your role is to help customers book gaming stations through natural conversation.

**Your Capabilities:**
1. **Check Available Stations**: You can retrieve a list of all available gaming stations, their types (PS5, 8-Ball Pool, VR), hourly rates, and current availability.
2. **Create Bookings**: You can create bookings for customers when they provide:
   - Customer name
   - Phone number
   - Station ID (you can get this from the available stations list)
   - Booking date (YYYY-MM-DD format)
   - Start time (24-hour format, e.g., 14:00 for 2:00 PM)
   - End time (24-hour format, e.g., 15:00 for 3:00 PM)
   - Optional: Duration in minutes, email, notes

**Station Types Available:**
- PS5 Controllers: ₹150/hour
- 8-Ball Pool Tables: ₹300/hour
- VR Headsets (Meta Quest): ₹150/hour

**Booking Process:**
1. When a customer wants to book, first check available stations if they haven't specified a station ID
2. Ask for the required information (name, phone, date, time)
3. Confirm the booking details before creating it
4. Create the booking using the create_booking tool
5. Provide a friendly confirmation with booking details

**Important Guidelines:**
- Always confirm booking details before creating
- Use 24-hour time format (e.g., 14:00 not 2:00 PM)
- Dates must be in YYYY-MM-DD format
- If a customer doesn't know station IDs, use the get_available_stations tool first
- Be friendly, professional, and helpful
- If booking creation fails, explain the error clearly and offer to try again

**Example Conversation Flow:**
Customer: "I want to book a PS5 for tomorrow at 2 PM"
You: "I'd be happy to help you book a PS5 station! Let me check what's available... [use get_available_stations tool] ... I found several PS5 stations available. Could you please provide:
- Your full name
- Your phone number
- The exact date (tomorrow would be YYYY-MM-DD)
- How long you'd like to play (e.g., 1 hour, 2 hours)

Once I have this information, I'll create your booking!"
```

## 🧪 Testing Guide

### Step 1: Configure Your Agent

1. **Go to Agents** in ElevenLabs dashboard
2. **Create a new agent** or edit an existing one
3. **Add the tools:**
   - Go to "Tools" section
   - Enable `create_booking` tool
   - Enable `get_available_stations` tool (if you added it)

4. **Set the System Prompt:**
   - Paste the agent prompt above into the "System Prompt" or "Instructions" field
   - Set the Main Goal as described above

5. **Configure Voice & Settings:**
   - Choose a voice
   - Set conversation settings
   - Enable interruptions (so you can correct mistakes)

### Step 2: Test Scenarios

#### Test 1: Simple Booking Request
**You say:** "I want to book a PS5 station for tomorrow at 2 PM for 1 hour"

**Expected Agent Behavior:**
1. Agent should ask for your name and phone number
2. Agent should use `get_available_stations` to find available PS5 stations
3. Agent should confirm the booking details
4. Agent should call `create_booking` with:
   - customer_name: (your name)
   - customer_phone: (your phone)
   - station_id: (a PS5 station ID from the list)
   - booking_date: (tomorrow's date in YYYY-MM-DD)
   - start_time: "14:00"
   - end_time: "15:00"
5. Agent should confirm the booking was created

#### Test 2: Check Available Stations First
**You say:** "What gaming stations do you have available?"

**Expected Agent Behavior:**
1. Agent should call `get_available_stations`
2. Agent should list the stations with:
   - Station names
   - Types
   - Hourly rates
   - Availability status

#### Test 3: Booking with Specific Station
**You say:** "Book station PS5 Controller 1 for John Doe, phone 9876543210, on 2025-01-20 from 16:00 to 17:00"

**Expected Agent Behavior:**
1. Agent should confirm the details
2. Agent should call `create_booking` with all the provided information
3. Agent should confirm success

#### Test 4: Error Handling
**You say:** "Book a station for tomorrow" (without providing required details)

**Expected Agent Behavior:**
1. Agent should ask for missing information (name, phone, station, date, time)
2. Agent should guide you through providing all required fields

### Step 3: Monitor Tool Calls

1. **During the conversation**, watch for tool calls in the ElevenLabs interface
2. **Check the tool execution:**
   - Tool name should appear
   - Request payload should show the data being sent
   - Response should show success/error

3. **Check Vercel Logs:**
   - Go to your Vercel dashboard
   - Check function logs for `/api/webhooks/elevenlabs-booking`
   - You should see:
     - `🤖 ElevenLabs webhook payload:` with the request data
     - `✅ Booking created successfully:` on success
     - Error messages if something fails

### Step 4: Verify Bookings

1. **Check your Cuephoria POS:**
   - Go to Booking Management page
   - Look for the newly created booking
   - Verify all details are correct

2. **Check Customer:**
   - If it's a new customer, they should be created automatically
   - If existing, the booking should be linked to their account

## 📝 Example Test Conversations

### Conversation 1: Complete Booking Flow
```
You: "Hi, I want to book a gaming station"
Agent: "Hello! I'd be happy to help you book a gaming station. What type of station are you interested in? We have PS5 controllers, 8-Ball pool tables, and VR headsets available."
You: "A PS5 please"
Agent: "Great choice! Let me check what PS5 stations are available... [calls get_available_stations] ... I found several PS5 stations. When would you like to book?"
You: "Tomorrow at 2 PM for 2 hours"
Agent: "Perfect! I'll need a few details to complete your booking:
- Your full name
- Your phone number"
You: "John Doe, 9876543210"
Agent: "Thank you! Let me create your booking... [calls create_booking] ... ✅ Your booking has been confirmed! You have PS5 Controller 1 booked for tomorrow (2025-01-20) from 14:00 to 16:00. The total cost will be ₹300. See you then!"
```

### Conversation 2: Quick Booking
```
You: "Book PS5 Controller 2 for Alice Smith, phone 9876543211, on 2025-01-21 from 15:00 to 17:00"
Agent: "I'll create that booking for you right away... [calls create_booking] ... ✅ Booking confirmed! Alice Smith has PS5 Controller 2 booked on 2025-01-21 from 15:00 to 17:00. Total: ₹300."
```

## 🔍 Troubleshooting

### Agent doesn't call the tool
- **Check:** Are the tools enabled in the agent settings?
- **Check:** Is the tool name correct in the agent's instructions?
- **Solution:** Make sure tools are added to the agent and the system prompt mentions them

### Tool call fails
- **Check Vercel logs:** Look for error messages
- **Check tool response:** See what error the tool returned
- **Common issues:**
  - Invalid station ID → Use `get_available_stations` first
  - Wrong date format → Must be YYYY-MM-DD
  - Wrong time format → Must be HH:MM (24-hour)

### Booking not appearing in POS
- **Check:** Vercel logs to see if booking was created
- **Check:** Database directly if needed
- **Check:** Booking Management page filters

## ✅ Success Criteria

Your integration is working correctly if:
1. ✅ Agent can list available stations
2. ✅ Agent can create bookings with correct data
3. ✅ Bookings appear in your POS system
4. ✅ Customers are created/updated correctly
5. ✅ Agent provides friendly confirmations
6. ✅ Error handling works properly

## 🎯 Next Steps

1. **Test thoroughly** with various scenarios
2. **Refine the agent prompt** based on test results
3. **Add more context** to the agent's knowledge base if needed
4. **Train the agent** on common booking patterns
5. **Monitor real conversations** and improve based on feedback

---

**Happy Testing! 🚀**

