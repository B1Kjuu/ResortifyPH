# Owner Chat Experience Guide

## What Resort/Staycation Owners See

### 1. Automatic Chat Creation When Booking is Made ✅

**When a guest books a resort:**

1. **Chat is automatically created** with:

   - Guest as participant (role: 'guest')
   - Owner as participant (role: 'owner')
   - Linked to the booking_id

2. **Welcome message is automatically sent** containing:
   ```
   Hi! I'd like to book [Resort Name] from [Check-in Date] to [Check-out Date]
   for [X guests]. Looking forward to hearing from you!
   ```
   - This message appears in the owner's inbox immediately
   - Owner receives notification of new unread message

### 2. Owner's Chat Inbox

**Location:** `/chat` page or from booking management page

**What owners see in their inbox:**

```
┌─────────────────────────────────────────────────┐
│ Paradise Beach Resort                    [3]    │
│ Guest: John Smith                               │
│ Hi! I'd like to book Paradise Beach...         │
│                                    [Open] ──────┤
├─────────────────────────────────────────────────┤
│ Mountain View Villa                      [1]    │
│ Guest: Sarah Johnson                            │
│ When can I check in?                            │
│                                    [Open] ──────┤
└─────────────────────────────────────────────────┘
```

**Features:**

- **Resort Name** as chat title (not generic "Booking Chat")
- **Guest Name** shown below resort name
- **Unread badge** with count (blue circle with number)
- **Last message preview** to quickly scan
- **"Open" button** to view full conversation

### 3. Owner's Booking Management Page

**Location:** `/owner/bookings`

**Each booking card shows:**

- Guest details (name, email)
- Booking dates and guest count
- Status (Pending, Confirmed, etc.)
- **"Open Chat" button** next to Confirm/Reject buttons

**Example:**

```
┌──────────────────────────────────────────────┐
│ Paradise Beach Resort            [⏳ Pending] │
│ 👤 John Smith                                 │
│ 📧 john@example.com                           │
│                                               │
│ 📅 Dec 25, 2025 → Dec 30, 2025               │
│ 👥 4 guests                                   │
│                                               │
│ [✅ Confirm] [❌ Reject] [💬 Open Chat]      │
└──────────────────────────────────────────────┘
```

### 4. Chat Window for Owners

**Title Bar Shows:**

- **Resort name** instead of generic title
- **Online status** of guest (green dot + "1 online")
- Example: "Chat about Paradise Beach Resort"

**Features Available:**

- Full message history
- Real-time messaging (messages appear instantly)
- File attachments (images, PDFs, documents)
- Emoji reactions (👍❤️😂😮😢🎉)
- Read receipts (double checkmark)
- Typing indicators ("Guest is typing...")
- Online/offline status

### 5. Notification Flow

**When guest makes booking:**

```
Guest Action                    Owner Sees
─────────────────────────────────────────────────
1. Guest clicks "Book Now"  →  (Processing...)

2. Booking created          →  Appears in /owner/bookings
                                Status: Pending

3. Chat auto-created        →  New chat in inbox
                                Unread badge: [1]

4. Welcome message sent     →  "Hi! I'd like to book..."
                                Notification appears

5. Guest navigates to chat  →  Owner sees "Guest is online"
                                (if owner is viewing chat)
```

### 6. Owner Response Workflow

**Typical interaction:**

1. **Owner checks bookings page**

   - Sees pending request with guest details
   - Clicks "Open Chat" to discuss

2. **Owner responds in chat**

   ```
   Owner: "Hi John! Thank you for your interest.
   I can confirm those dates are available.
   Let me know if you have any questions!"
   ```

3. **Owner confirms/rejects booking**

   - Returns to bookings page
   - Clicks "✅ Confirm" or "❌ Reject"
   - Can continue chatting after decision

4. **Ongoing communication**
   - Check-in instructions
   - Special requests
   - Post-booking support

## Technical Details

### Database Schema

**chats table:**

- `booking_id` - Links chat to specific booking
- `creator_id` - User who created booking (guest)
- `resort_id` - Can also be used for resort-general chats

**chat_participants table:**

- Guest: `role = 'guest'`
- Owner: `role = 'owner'`

**chat_messages table:**

- Automatically created welcome message
- Real-time sync via Supabase realtime

### Automatic Chat Creation Code

Located in: `app/resorts/[id]/page.tsx`

```typescript
// After booking is created:
1. Create chat with booking_id
2. Add guest as participant (role: 'guest')
3. Add owner as participant (role: 'owner')
4. Send welcome message from guest
5. Navigate guest to chat
```

### ChatList Component Updates

Located in: `components/ChatList.tsx`

**Shows:**

- Resort name (fetched from bookings → resorts)
- Participant info (guest/owner name from profiles)
- Last message preview
- Unread count per chat

## Owner Benefits

### 1. **Instant Communication**

- No delay between booking and first contact
- Welcome message sets professional tone
- Owner can respond immediately

### 2. **Context-Rich Inbox**

- Resort names instead of generic labels
- Guest names clearly displayed
- Easy to prioritize responses

### 3. **Integrated Workflow**

- Chat accessible from booking management
- No need to switch platforms
- All booking details available

### 4. **Professional Features**

- Rich messaging (attachments, reactions)
- Real-time presence (online/offline)
- Read receipts (know when guest sees message)

### 5. **Centralized Management**

- All booking conversations in one place
- Easy to track multiple properties
- Searchable message history

## Guest Benefits

### 1. **Immediate Engagement**

- Chat opens automatically after booking
- Pre-filled welcome message
- No waiting for owner to "accept chat"

### 2. **Transparent Communication**

- See when owner is online
- Know when messages are read
- Real-time responses

### 3. **Rich Media Support**

- Send photos of IDs for verification
- Share travel documents
- Attach payment confirmations

## Best Practices for Owners

### 1. **Quick Response Times**

- Check inbox daily (or enable push notifications)
- Respond to new bookings within 24 hours
- Set status to "online" when available

### 2. **Professional Communication**

- Thank guests for booking
- Provide clear check-in instructions
- Be available for questions

### 3. **Use Features Effectively**

- Send property photos via attachments
- React to messages (👍) to acknowledge
- Use typing indicator by being responsive

### 4. **Manage Multiple Properties**

- Use resort name in chat titles to identify
- Prioritize pending bookings
- Keep conversations organized

## Future Enhancements

### Potential Additions:

1. **Push notifications** for new messages
2. **Email alerts** for booking chats
3. **Quick replies** (templates for common questions)
4. **Chat tags** (urgent, payment pending, etc.)
5. **Audio/video messages**
6. **Automated responses** (business hours, FAQ)
7. **Chat analytics** (response time tracking)
8. **Multi-owner support** (team collaboration)

---

## Testing Instructions

### As Owner:

1. Wait for guest to make booking
2. Go to `/owner/bookings`
3. See pending booking with "Open Chat" button
4. Click "Open Chat" - should show:
   - Resort name as title
   - Automatic welcome message from guest
   - Real-time messaging enabled
5. Respond to guest
6. Confirm or reject booking
7. Continue chatting as needed

### As Guest:

1. Book a resort at `/resorts/[id]`
2. Automatically redirected to chat
3. See pre-filled welcome message
4. Chat with owner
5. Receive booking confirmation via chat

---

**Last Updated:** December 22, 2024
**Version:** 1.0
