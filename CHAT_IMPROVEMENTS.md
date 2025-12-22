# Chat System Improvements

## Changes Made (December 22, 2024)

### 1. Dynamic Chat Title ✅

**Problem:** The chat window always showed "Booking Chat" as a static title.

**Solution:** Implemented dynamic title loading based on context:

- For booking chats: Shows "Chat about [Resort Name]"
- For resort chats: Shows "Chat about [Resort Name]"
- Falls back to custom title prop or just "Chat" if data unavailable

**Implementation:**

- Added `dynamicTitle` state to `ChatWindow`
- Fetches booking/resort details after chat loads
- Title hierarchy: custom title prop → dynamic title → fallback "Chat"

### 2. Realtime Message Delivery Diagnostics 🔍

**Problem:** User reported delays in receiving messages through realtime subscription.

**Solution:** Added comprehensive logging and optimized subscription configuration:

#### Logging Added:

- ✅ Subscription status tracking (SUBSCRIBED, CHANNEL_ERROR)
- ✅ Message send timing (shows insert duration in ms)
- ✅ Message receive events (logs when new messages arrive)
- ✅ Duplicate detection warnings

#### Optimizations:

- Added explicit channel config with `broadcast: { self: false }` and `presence: { key: uid }`
- Enhanced subscription callback to log connection status
- Added performance timing for message inserts

### 3. Console Logging for Debugging 📊

The following logs will appear in browser console:

**When sending a message:**

```
📤 Sending message...
⏱️ Message insert took 127ms
✅ Message sent successfully, ID: abc-123-def
```

**When receiving a message:**

```
📨 New message received: abc-123-def
✅ Adding new message to state
```

**If duplicate detected:**

```
⚠️ Message already exists, skipping
```

**Connection status:**

```
🔌 Chat channel subscription status: SUBSCRIBED
✅ Successfully subscribed to chat channel
🔌 Presence channel subscription status: SUBSCRIBED
```

## How to Debug Delays

### Step 1: Open Browser Console

Press F12 and go to Console tab while using the chat

### Step 2: Send a Test Message

Look for these metrics:

- **Insert time:** Should be < 500ms
  - If > 1000ms: Database performance issue
- **Subscription status:** Should say "SUBSCRIBED"
  - If not: Realtime connection issue

### Step 3: Open Chat in Two Browser Windows

- Send from Window 1
- Watch console in Window 2
- Measure time between "Message sent" (Window 1) and "New message received" (Window 2)
- **Expected:** < 500ms
- **If > 2 seconds:** Supabase realtime latency (check Supabase dashboard)

## Potential Issues & Solutions

### Issue: Subscription shows "CHANNEL_ERROR"

**Cause:** Realtime not enabled on tables or RLS blocking access
**Fix:**

```sql
-- Ensure realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Verify RLS policies allow SELECT on all tables
```

### Issue: Message insert takes > 1 second

**Cause:** Database performance or missing indexes
**Fix:**

```sql
-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
```

### Issue: No logs appear in console

**Cause:** Production build strips console logs
**Fix:** Ensure running in development mode (`npm run dev`)

## Testing Instructions

1. **Start dev server:**

   ```bash
   npm run dev
   ```

2. **Open chat in two browser tabs:**

   - Tab 1: Sign in as User A
   - Tab 2: Sign in as User B (use incognito/private window)

3. **Send message from Tab 1**

   - Check console logs for timing
   - Switch to Tab 2
   - Message should appear within 500ms

4. **Check subscription status:**
   - Look for "✅ Successfully subscribed" messages in console
   - Both tabs should show this on load

## Next Steps

If delays persist after these improvements:

1. **Check Supabase Dashboard:**

   - Go to Database → Replication
   - Ensure `chat_messages` is in publication

2. **Monitor Supabase Logs:**

   - Go to Logs → Realtime
   - Look for connection errors or rate limiting

3. **Consider Optimistic Updates:**

   - Currently implemented (messages show immediately for sender)
   - Realtime is only for receiving messages from others

4. **Network Inspection:**
   - Browser DevTools → Network tab
   - Filter for WebSocket connections
   - Check for reconnection loops

## Files Modified

- `components/ChatWindow.tsx`
  - Added `dynamicTitle` state
  - Fetch booking/resort data for title
  - Enhanced realtime subscription config
  - Added comprehensive logging
  - Improved duplicate detection

---

**Note:** The logging will help diagnose whether the delay is:

- Database insert time (backend performance)
- Realtime propagation (Supabase infrastructure)
- Network latency (user's connection)
- Frontend processing (React rendering)
