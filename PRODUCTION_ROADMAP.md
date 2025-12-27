# ResortifyPH - Production Roadmap

## Build an Airbnb-Competitor for Philippine Resorts

**Current Status:** Core MVP 60% Complete | Enterprise Features 10% Complete  
**Target Launch:** 8-12 weeks  
**Estimated Team:** 2-3 senior developers + 1 designer

---

## 🎯 Product Vision

ResortifyPH is a **vacation rental platform** like Airbnb, specifically designed for Philippine resort owners and travelers. The platform enables:

- **For Guests:** Discover and book resort accommodations with confidence
- **For Owners:** Monetize their properties with professional listing management
- **For Admin:** Monitor platform health, moderate content, and manage disputes

---

## 📊 Current Status vs Airbnb

| Feature Area            | Status      | Completeness                                  |
| ----------------------- | ----------- | --------------------------------------------- |
| **User Authentication** | ✅ Complete | 100%                                          |
| **Resort Listings**     | ✅ Complete | 100%                                          |
| **Basic Booking**       | ✅ Complete | 60% (payment deferred)                        |
| **Payment Processing**  | ⏸️ Deferred | 0% (post-MVP)                                 |
| **Visual Calendars**    | ⚠️ Partial  | 30% (date-range picker; full availability TBD) |
| **Reviews & Ratings**   | ✅ MVP      | 60% (eligibility + submission/display)        |
| **Messaging System**    | ✅ MVP      | 70% (chat, soft-deletes, audit logs)          |
| **Search & Discovery**  | ✅ Improved | 60% (map picker, address cleaning, search UX) |
| **Host Analytics**      | ❌ MISSING  | 0%                                            |
| **Form Validation**     | ⚠️ Basic    | 40% (core flows covered)                      |
| **Error Handling**      | ✅ Improved | 60% (toasts + resilient navigation)           |
| **Admin Panel**         | ✅ Enhanced | 60% (approvals + audit visibility)            |

**Overall:** Core MVP >50% implemented; payments deferred post-MVP

---

## 🔴 CRITICAL PATH - Must Complete for Launch

### Phase 1: Payment & Booking (Weeks 1-2)

#### 1.1 Stripe Integration

```bash
npm install stripe @stripe/react-js
npm install next-stripe
```

**What needs to be built:**

- `/api/stripe/create-payment-intent` - Server endpoint
- `/api/stripe/webhooks` - Handle payment events
- `components/PaymentForm.tsx` - Stripe payment UI
- `components/PaymentConfirmation.tsx` - Receipt display
- Owner payout system & dashboard

**Key Logic:**

```typescript
// When guest confirms booking:
const { error, clientSecret } = await fetch(
  "/api/stripe/create-payment-intent",
  {
    method: "POST",
    body: JSON.stringify({
      amount: totalCost * 100, // in cents
      bookingId: booking.id,
      currency: "PHP",
    }),
  }
);
// Show Stripe payment form with clientSecret
```

**Database changes:**

```sql
ALTER TABLE bookings ADD COLUMN payment_id TEXT
ALTER TABLE bookings ADD COLUMN payment_status TEXT -- pending, completed, failed
ALTER TABLE bookings ADD COLUMN total_cost INTEGER

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings,
  owner_id UUID REFERENCES profiles,
  amount INTEGER,
  status TEXT,
  stripe_transaction_id TEXT,
  created_at TIMESTAMP
)

CREATE TABLE payouts (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles,
  amount INTEGER,
  status TEXT,
  payout_date TIMESTAMP,
  created_at TIMESTAMP
)
```

**Effort:** 2 weeks | **Blocking:** Everything else

---

#### 1.2 Booking Flow Enhancement

- ✅ Already have: Date selection, guest count validation
- ⚠️ Need: Price calculation (nightly, cleaning fee, taxes)
- ⚠️ Need: Booking confirmation email
- ⚠️ Need: Payment status tracking

**Improvements to `/app/resorts/[id]/page.tsx`:**

```typescript
// Add to booking form:
const nightCount = daysBetween(dateFrom, dateTo);
const cleaningFee = 500; // PHP
const taxes = (price * nightCount + cleaningFee) * 0.12; // 12% tax
const totalCost = price * nightCount + cleaningFee + taxes;

// Show breakdown to guest:
// Nightly rate: ₱{price} × {nightCount} nights = ₱{price * nightCount}
// Cleaning fee: ₱{cleaningFee}
// Taxes & fees: ₱{taxes}
// TOTAL: ₱{totalCost}
```

**Effort:** 1 week (with Stripe integration)

---

### Phase 2: Search & Location (Weeks 2-3)

#### 2.1 Map-Based Location Picker & Address Cleaning (COMPLETE)

- Resort create/edit pages now feature an interactive map-based location picker
- Address search uses Nominatim (OpenStreetMap) and cleans non-Latin characters
- Map zooms/pans to selected search or pin
- "No results found" feedback in search dropdown
- Improved UX: click map, drag marker, or use current location

#### 2.2 Interactive Calendar Component

```bash
npm install react-big-calendar
# OR
npm install react-calendar react-date-range
```

**Components to build:**

- `components/AvailabilityCalendar.tsx` - Show booked/free dates
- `components/GuestDatePicker.tsx` - Guest date selection with calendar
- `components/OwnerCalendarManager.tsx` - Owner availability management
- `components/BlockDates.tsx` - Owner tool to block maintenance dates

**Features:**

- Show 3-6 months at a time
- Color coding: ✅ Available (green), ❌ Booked (red), ⏸️ Blocked (gray)
- Price variation by season (if implemented)
- Mobile-responsive date picker
- Sync with booking status in real-time

**Database schema for blocked dates:**

```sql
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY,
  resort_id UUID REFERENCES resorts,
  date_from DATE,
  date_to DATE,
  reason TEXT,
  created_at TIMESTAMP
)
```

**Logic in calendar:**

```typescript
// Determine availability
const isBooked = bookings.some(
  (b) => new Date(b.date_from) <= date && date <= new Date(b.date_to)
);
const isBlocked = blockedDates.some(
  (b) => new Date(b.date_from) <= date && date <= new Date(b.date_to)
);
const isAvailable = !isBooked && !isBlocked;
```

**Effort:** 1 week

---

### Phase 3: Reviews & Ratings (Weeks 3-4.5)

#### 3.1 Review System

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Overall rating (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Category ratings
  cleanliness INTEGER CHECK (cleanliness >= 1 AND cleanliness <= 5),
  accuracy INTEGER CHECK (accuracy >= 1 AND accuracy <= 5),
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  value INTEGER CHECK (value >= 1 AND value <= 5),

  -- Review content
  comment TEXT NOT NULL,
  photos TEXT[],

  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)

CREATE TABLE owner_responses (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id),
  response_text TEXT,
  created_at TIMESTAMP
)
```

**Components:**

- `components/ReviewCard.tsx` - Display single review
- `components/ReviewForm.tsx` - Guest submit review (show after checkout)
- `components/ReviewList.tsx` - Show all reviews for resort
- `components/OwnerReviewResponse.tsx` - Owner can reply to reviews
- `components/RatingStars.tsx` - 5-star display/input

**Key Features:**

- Only allow reviews for completed bookings
- Show verified booking badge
- Average rating calculation (overall + by category)
- Owner can respond to each review
- Admin moderation of inappropriate reviews
- Sort reviews by: newest, helpful, highest/lowest rating

**Effort:** 1.5 weeks

---

### Phase 4: Messaging System (Weeks 4.5-6.5)

#### 4.1 Guest-Host Messaging

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id),
  host_id UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
)

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
)

CREATE INDEX ON messages(conversation_id, created_at DESC)
CREATE INDEX ON conversations(guest_id)
CREATE INDEX ON conversations(host_id)
```

**Components:**

- `components/MessageList.tsx` - Display messages
- `components/MessageInput.tsx` - Send message
- `components/ChatWidget.tsx` - Chat interface
- `/app/messages/page.tsx` - Message inbox
- `/app/messages/[conversationId]/page.tsx` - Individual conversation

**Real-time with Supabase Realtime:**

```typescript
// Subscribe to new messages
supabase
  .from("messages")
  .on("INSERT", (payload) => {
    setMessages((prev) => [...prev, payload.new]);
  })
  .subscribe();
```

**Features:**

- Auto-create conversation when booking confirmed
- Message notifications
- Show guest profile in conversation
- Block messaging during dispute
- Message moderation (swear filter, pattern detection)

**Effort:** 2 weeks

---

### Phase 5: Form Validation & Error Handling (Week 1, Parallel)

#### 5.1 Input Validation

```bash
npm install react-hook-form zod @hookform/resolvers
npm install sonner  # toast notifications
```

**Apply to all forms:**

- Resort creation/edit
- Guest signup
- Booking forms
- Profile updates
- Password changes

**Example validation:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const resortSchema = z.object({
  name: z
    .string()
    .min(5, "Name must be at least 5 characters")
    .max(100, "Name too long"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000),
  price: z.number().min(500, "Price too low").max(999999),
  contact: z
    .string()
    .regex(/^\+?63\d{9,10}$|^\d{10}$/, "Invalid Philippine phone number"),
  capacity: z.number().min(1, "Capacity must be at least 1").max(100),
  location: z.string().min(3),
});

export default function CreateResortForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resortSchema),
  });

  const onSubmit = async (data) => {
    try {
      const { error } = await supabase.from("resorts").insert(data);
      if (error) throw error;
      toast.success("Resort created!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && (
        <span className="text-red-500">{errors.name.message}</span>
      )}

      <button disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Resort"}
      </button>
    </form>
  );
}
```

**Effort:** 3-5 days (critical quality improvement)

---

## 🟠 HIGH PRIORITY - Complete in Phase 2

### 6. Admin Moderation Panel (Week 4)

**Current:** Basic admin dashboard  
**Needed:** Full content moderation

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  resource_type TEXT, -- resort, review, message, user
  resource_id UUID,
  reporter_id UUID REFERENCES profiles,
  reason TEXT,
  status TEXT DEFAULT 'open', -- open, investigating, resolved, dismissed
  created_at TIMESTAMP
)

CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports,
  admin_id UUID REFERENCES profiles,
  action TEXT, -- approve, reject, warn, suspend
  notes TEXT,
  created_at TIMESTAMP
)
```

**Admin dashboard features:**

- Report queue with filters
- Quick approve/reject actions
- User suspension management
- Content restoration
- Audit trail of all actions

**Effort:** 1 week

---

### 7. Host Analytics Dashboard (Week 5)

**Track:**

- Monthly bookings (count + revenue)
- Occupancy rate (booked days / total days)
- Guest ratings trend
- Revenue by month
- Views vs bookings conversion
- Search ranking/visibility

**Components:**

- `components/EarningsChart.tsx` - Revenue over time
- `components/OccupancyChart.tsx` - Booking trends
- `components/RatingsChart.tsx` - Guest satisfaction
- `/owner/analytics/page.tsx` - Full dashboard

**Effort:** 1.5 weeks

---

## 🟡 IMPORTANT - Nice to Have

### 8. Search Algorithm & Personalization

- Search by amenities, rating, availability
- Sort by relevance (if user has reviews in similar type)
- Trending resorts
- "Similar to this resort" recommendations

**Effort:** 1 week

### 9. Mobile Responsiveness Audit

- Test on various phones/tablets
- Optimize touch targets
- Improve mobile checkout flow

**Effort:** 3-5 days

### 10. Email Notifications

- Booking confirmation
- Guest reviews incoming
- New booking requests
- Owner messages
- Weekly earnings summary

**Use:** Supabase + SendGrid or Mailgun

**Effort:** 1 week

---

## 📅 Development Timeline (Recommended)

```
Week 1:  Payment integration + Form validation + Error handling
Week 2:  Calendar component + Booking flow fixes + Testing
Week 3:  Reviews system (part 1)
Week 4:  Reviews system (part 2) + Admin moderation panel
Week 5:  Messaging system (part 1)
Week 6:  Messaging system (part 2) + Host analytics
Week 7:  Buffer week for bugs + Polish
Week 8:  QA testing + Performance optimization
Week 9-12: Beta launch → Production

TOTAL: 8-12 weeks
```

---

## 💰 Development Cost Estimates

| Task                | Effort       | Cost (₱)     | Notes                           |
| ------------------- | ------------ | ------------ | ------------------------------- |
| Payment Integration | 2 weeks      | 80,000       | Stripe setup, webhooks, payouts |
| Calendar Component  | 1 week       | 40,000       | React-big-calendar integration  |
| Reviews System      | 1.5 weeks    | 60,000       | Ratings, moderation, responses  |
| Messaging System    | 2 weeks      | 80,000       | Real-time, notifications        |
| Form Validation     | 1 week       | 40,000       | Zod + React Hook Form           |
| Admin Moderation    | 1 week       | 40,000       | Report system + actions         |
| Host Analytics      | 1.5 weeks    | 60,000       | Charts, metrics, dashboards     |
| Testing & QA        | 2 weeks      | 80,000       | E2E, performance, security      |
| **TOTAL**           | **12 weeks** | **₱480,000** | 1 senior dev + 1 mid-level dev  |

---

## ✅ Go-Live Checklist

### Technical Requirements

- [ ] Payment processing tested with real transactions
- [ ] All forms validated and error messages display
- [ ] Calendar component loads and calculates availability correctly
- [ ] Reviews moderation working
- [ ] Messaging real-time delivery verified
- [ ] Admin dashboard fully functional
- [ ] Performance: Page load < 2s, API response < 500ms
- [ ] 95%+ test coverage on critical paths
- [ ] Security: RLS policies enforced, rate limiting enabled
- [ ] Error logging configured (Sentry or similar)

### Compliance & Security

- [ ] Terms of Service updated
- [ ] Privacy Policy compliant with Philippine data law
- [ ] Payment PCI compliance verified
- [ ] Backup & disaster recovery tested
- [ ] HTTPS enforced on all routes
- [ ] Admin access controls secure

### Content & Moderation

- [ ] Community guidelines published
- [ ] Content moderation team trained
- [ ] Review moderation process documented
- [ ] Dispute resolution process ready

### Marketing & Growth

- [ ] Landing page marketing copy refined
- [ ] Social media presence setup
- [ ] Email drip campaign ready
- [ ] Influencer outreach plan
- [ ] Press release prepared

---

## 🚀 Post-Launch Priorities

### Phase 2 (Weeks 13-16)

- Mobile app (iOS/Android) via React Native or Flutter
- Advanced search/recommendation algorithm
- Seasonal pricing support
- Bulk host tools (import calendar, pricing rules)

### Phase 3 (Weeks 17-24)

- Loyalty program (guest rewards)
- Host subscription tiers
- Insurance/damage protection
- Guest verification system

### Long-term

- Travel insurance integration
- Concierge services
- Corporate booking
- International expansion

---

## 🎓 Technical Debt & Quality

### Must Address Before Launch

1. All forms must validate input (Zod)
2. All errors must show to users (Sonner)
3. All async operations must have loading states
4. Type safety: Replace all `any` with proper types
5. Database: Implement RLS (Row Level Security)
6. Security: CSRF tokens on forms
7. Performance: Image optimization + CDN
8. Monitoring: Error tracking + analytics

### Post-Launch Improvements

- Add unit tests (Jest)
- Add E2E tests (Cypress/Playwright)
- Set up CI/CD (GitHub Actions)
- Database query optimization
- Caching strategy (Redis)
- Rate limiting on all APIs

---

## ⚡ Quick Wins (Do This Week)

These can be done in parallel, boost UX significantly:

1. **Add form validation** (3 days)

   - Already have React Hook Form + Zod dependencies in package
   - Apply to create-resort, booking, signup forms
   - Install: `npm install sonner` for toast feedback

2. **Add loading states** (2 days)

   - Update all buttons with disabled + spinner states
   - Show feedback on async operations

3. **Improve error messages** (2 days)

   - Catch all try-catch blocks
   - Show toast notifications instead of console logs
   - Add helpful error text for users

4. **Configure Stripe** (5 days)
   - Get Stripe account
   - Implement `/api/stripe/*` endpoints
   - Add payment form to booking page

These 4 items can be done in **Week 1** and dramatically improve user experience!

---

## 📞 Questions for Product Decision

Before starting development:

1. **Pricing Strategy:** How much does ResortifyPH take? (Airbnb: ~15%)
2. **Guest Verification:** ID verification required? (Anti-fraud)
3. **Insurance:** Do you offer property damage protection?
4. **Dispute Resolution:** How long to resolve payment disputes?
5. **Geographic:** Start with 1 island or multiple?
6. **Capacity:** Expected launch: 100 resorts, 10,000 guests, or more?
7. **Seasonality:** Should hosts set seasonal pricing?
8. **Multi-lang:** English only or Filipino/other languages?

These decisions affect database schema and feature development.

---

## 🎯 Success Metrics

After launch, track:

- **Growth:** New resorts/bookings per week
- **Engagement:** Booking completion rate (drop-off analysis)
- **Trust:** Average review rating, guest retention
- **Revenue:** Total bookings × average price
- **Quality:** Page load time, error rate, customer support tickets

---

_This roadmap is your development blueprint. Adjust based on business priorities and available resources._
