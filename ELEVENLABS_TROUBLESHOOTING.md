# ElevenLabs Webhooks Not Being Called - Troubleshooting Guide

## 🔍 Common Issues & Solutions

### Issue 1: Tools Not Enabled in Agent

**Problem:** Tools are created but not enabled in the agent settings.

**Solution:**
1. Go to **Agents** → Select your agent
2. Go to **Tools** or **Available Tools** section
3. Make sure all tools are **enabled/toggled ON**:
   - ✅ `get_available_stations`
   - ✅ `get_customer`
   - ✅ `check_availability`
   - ✅ `create_booking`
4. **Save** the agent settings

---

### Issue 2: Tool Names Don't Match

**Problem:** The agent prompt mentions tool names that don't match the actual tool names in ElevenLabs.

**Solution:**
1. Check the **exact tool names** in ElevenLabs:
   - Go to **Tools** section
   - Note the exact names (case-sensitive)
2. Update the agent prompt to use **exact tool names**
3. Tool names should match exactly:
   - `get_available_stations` (not `getAvailableStations` or `get-available-stations`)
   - `get_customer` (not `getCustomer`)
   - `check_availability` (not `checkAvailability`)
   - `create_booking` (not `createBooking`)

---

### Issue 3: Agent Prompt Not Explicit Enough

**Problem:** The agent doesn't understand it should use tools.

**Solution:**
The agent prompt needs to be **very explicit** about using tools. Make sure it says:
- "**USE THE TOOL**" not just "you can"
- "**CALL THE TOOL**" not just "check"
- Include examples showing tool usage

---

### Issue 4: Tools Not Added to Agent

**Problem:** Tools exist but aren't linked to the agent.

**Solution:**
1. Go to **Agents** → Your agent
2. Find **"Tools"** or **"Available Tools"** section
3. Click **"Add Tool"** or **"Select Tools"**
4. Select all 4 tools:
   - `get_available_stations`
   - `get_customer`
   - `check_availability`
   - `create_booking`
5. **Save**

---

### Issue 5: Agent Not Understanding When to Use Tools

**Problem:** Agent responds but doesn't call tools.

**Solution:**
1. **Be more explicit in your test requests:**
   - Instead of: "I want to book"
   - Try: "Please use the create_booking tool to book a PS5 for me"
   
2. **Update the agent prompt** to be more directive:
   - Add: "**You MUST use tools to perform actions. Do not try to answer without using tools.**"
   - Add: "**When a customer asks to book, you MUST call the create_booking tool.**"

---

## ✅ Step-by-Step Verification Checklist

### 1. Verify Tools Are Created
- [ ] Go to **Tools** section in ElevenLabs
- [ ] Verify all 4 tools exist:
  - [ ] `get_available_stations`
  - [ ] `get_customer`
  - [ ] `check_availability`
  - [ ] `create_booking`

### 2. Verify Tools Are Enabled in Agent
- [ ] Go to **Agents** → Your agent
- [ ] Go to **Tools** section
- [ ] Verify all tools are **enabled/toggled ON**
- [ ] If not, enable them and **Save**

### 3. Verify Agent Prompt Mentions Tools
- [ ] Check the **System Prompt** or **Instructions** field
- [ ] Verify it mentions tool names explicitly
- [ ] Verify it instructs the agent to USE the tools
- [ ] Update if needed and **Save**

### 4. Test with Explicit Commands
Try these test phrases:
- "Use the get_available_stations tool to show me stations"
- "Call the create_booking tool with these details: name John, phone 9876543210..."
- "Check customer details using get_customer tool for phone 9876543210"

---

## 🧪 Testing Steps

### Test 1: Direct Tool Call
**Say:** "Use the get_available_stations tool right now"

**Expected:** Agent should call the tool immediately

**If it doesn't work:**
- Tool might not be enabled
- Tool name might be wrong
- Agent prompt might not be explicit enough

### Test 2: Natural Language
**Say:** "What stations do you have?"

**Expected:** Agent should call `get_available_stations` tool

**If it doesn't work:**
- Agent prompt needs to be more explicit
- Add: "When asked about stations, you MUST use the get_available_stations tool"

### Test 3: Booking Request
**Say:** "Book a PS5 for John Doe, phone 9876543210, tomorrow at 2 PM"

**Expected:** Agent should:
1. Call `get_customer` (optional)
2. Call `check_availability` (if instructed)
3. Call `create_booking`

**If it doesn't work:**
- Check if all tools are enabled
- Verify tool names match exactly
- Make agent prompt more explicit

---

## 🔧 Quick Fixes

### Fix 1: Make Agent Prompt More Explicit

Add this to the beginning of your agent prompt:

```
**CRITICAL: You MUST use tools to perform any actions. You cannot answer questions or perform tasks without using the available tools.**

**When to use tools:**
- When asked about stations → USE get_available_stations tool
- When asked about a customer → USE get_customer tool
- Before creating a booking → USE check_availability tool
- When creating a booking → USE create_booking tool

**You MUST call tools. Do not try to answer without using tools.**
```

### Fix 2: Check Tool Configuration

1. Go to each tool in ElevenLabs
2. Verify:
   - Tool name is correct
   - URL is correct
   - Method is correct
   - Body parameters are configured
3. Test each tool individually using the "Test" button if available

### Fix 3: Enable Tool Calls in Agent Settings

1. Go to Agent settings
2. Look for:
   - "Enable Tool Calls"
   - "Allow Tool Execution"
   - "Tool Permissions"
3. Make sure these are enabled

---

## 📞 Still Not Working?

If tools still aren't being called:

1. **Check ElevenLabs Logs:**
   - Go to agent conversation
   - Check if there are any error messages
   - Look for tool call attempts

2. **Verify Tool URLs:**
   - Test each webhook URL directly:
     - `https://admin.cuephoria.in/api/webhooks/available-stations`
     - `https://admin.cuephoria.in/api/webhooks/get-customer`
     - `https://admin.cuephoria.in/api/webhooks/check-availability`
     - `https://admin.cuephoria.in/api/webhooks/elevenlabs-booking`

3. **Check Agent Version:**
   - Make sure you're using the latest agent version
   - Some older versions might have tool calling issues

4. **Contact ElevenLabs Support:**
   - If nothing works, there might be an account/plan limitation
   - Some plans might not support tool calling

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Agent says "Let me check..." before calling tools
- ✅ You see tool execution in the conversation
- ✅ Agent provides data from tools (station lists, customer info, etc.)
- ✅ Bookings are actually created in your system

---

## 🎯 Most Common Fix

**90% of the time, the issue is: Tools are created but not enabled in the agent settings.**

**Quick Fix:**
1. Go to Agents → Your Agent
2. Go to Tools section
3. Enable all tools
4. Save
5. Test again

