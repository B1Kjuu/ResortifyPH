# 🚨 Urgent Fixes & Migrations Required

**Date:** January 9, 2026
**Priority:** Critical - Site Partially Broken

---

## ❌ Critical Issues

### 1. **Double-Encoding Error (404s on chat routes)**
**Status:** Still occurring despite code fix
**Error:** `%255BbookingId%255D` instead of `%5BbookingId%5D`
**Impact:** Users cannot access booking chats after creating bookings

**Root Cause:**
- Vercel's production build is double-encoding dynamic route chunks
- `window.location.href` fix was applied but build cache may be causing issues

**Solution:**
```bash
# Force rebuild in Vercel dashboard:
1. Go to Vercel Dashboard → ResortifyPH project
2. Deployments → Latest deployment → "Redeploy"
3. Check "Clear Build Cache"
4. Click "Redeploy"
```

---

## 📋 Database Migrations to Apply

**Location:** `supabase/migrations/`  
**Apply in:** Supabase Dashboard → SQL Editor

### Migration 1: Review Images Bucket ✅ HIGH PRIORITY
**File:** `20260109_create_review_images_bucket.sql`
**Why:** Users cannot upload photos with reviews
**Impact:** Review functionality broken on desktop + mobile

```sql
-- Run this in Supabase SQL Editor
-- Creates storage bucket for review photo uploads
```

### Migration 2: Overnight Booking Logic Fix ✅ HIGH PRIORITY  
**File:** `20260109_fix_overnight_booking_logic.sql`
**Why:** Cannot book overnight 28-29 after overnight 27-28
**Impact:** Guests blocked from consecutive overnight bookings

```sql
-- Run this in Supabase SQL Editor
-- Fixes exclusive end date logic for overnight bookings
```

### Migration 3: Payment Receipts Bucket
**File:** `20260109_create_payment_receipts_bucket.sql`
**Why:** Guests cannot submit payment receipts
**Impact:** Payment submission fails with network error

```sql
-- Run this in Supabase SQL Editor
-- Creates storage bucket for payment receipt uploads
```

---

## 🔔 Missing Features to Implement

### 1. Email Notifications Not Sending
**Problem:** Notification bell works, emails don't send
**Affected:**
- Booking requests (owner not notified via email)
- Booking accepted/rejected (guest not notified via email)
- Resort approved/rejected (owner not notified via email)

**Likely Cause:** Email API keys not configured or API routes have auth issues

**Check:**
- Verify `RESEND_API_KEY` or `SENDGRID_API_KEY` in Vercel environment variables
- Check `/api/notifications/*` routes for proper auth handling

---

### 2. Review Notifications Missing
**Problem:** No notification when someone reviews your resort
**Needs:**
- In-app notification (bell icon)
- Email notification to owner

**Implementation Required:**
- Add notification trigger in review submission
- Create `/api/notifications/review-posted` endpoint
- Add to notification types

---

### 3. Reviewer Name Anonymization
**Problem:** Full names shown on reviews (privacy concern)
**Current:** "Joebeck Gusi"
**Desired:** "J*****k G**i" + profile picture

**Implementation Required:**
- Create name masking utility function
- Update ReviewsList component to mask names
- Add profile picture display

---

### 4. Auto-Send Payment Template
**Problem:** Manual template selection is cumbersome
**Desired:** Click "Payment Details" button → auto-sends template as toast notification

**Implementation Required:**
- Add auto-send logic to payment template button
- Create toast notification for sent template
- Add to both owner and guest sides

---

### 5. Payment Settings in Chat Interface
**Problem:** Owner must leave chat to access payment settings
**Desired:** Payment settings button visible in chat (desktop + mobile)

**Implementation Required:**
- Add payment settings link in chat header/sidebar
- Make responsive for mobile
- Position near existing chat controls

---

### 6. Booking Type Display & Filter
**Problem:** Confirmed bookings don't show booking type (daytour/overnight/22hrs)
**Desired:** 
- Display booking type on each confirmed booking
- Add filter dropdown to filter by type

**Implementation Required:**
- Add `booking_type` display in booking cards
- Create filter component with options: All, Daytour, Overnight, Long Stay (22hrs)
- Apply filter to booking list

---

## 🎯 Immediate Action Items (in order)

1. **Apply migrations** in Supabase SQL Editor (3 files)
2. **Redeploy with cache clear** in Vercel (fix double-encoding)
3. **Verify email API keys** are set in Vercel env vars
4. **Test booking flow** end-to-end after redeploy
5. **Implement remaining features** (reviews, anonymization, filters)

---

## 📊 Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Fix double-encoding | Critical | Low (redeploy) | 🔥 P0 |
| Review image uploads | High | Low (migration) | 🔥 P0 |
| Overnight booking fix | High | Low (migration) | 🔥 P0 |
| Email notifications | High | Medium | 🟡 P1 |
| Review notifications | Medium | Medium | 🟡 P1 |
| Anonymize reviewers | Medium | Low | 🟢 P2 |
| Auto-send payment | Low | Low | 🟢 P2 |
| Payment settings in chat | Low | Low | 🟢 P2 |
| Booking type filter | Low | Low | 🟢 P2 |

---

## 🧪 Testing Checklist After Fixes

- [ ] Create booking → successfully redirects to chat
- [ ] Upload review images → works on desktop + mobile
- [ ] Book overnight 27-28 → can book overnight 28-29
- [ ] Submit payment receipt → no network error
- [ ] Receive email when booking created
- [ ] Receive email when booking accepted/rejected
- [ ] Receive notification when resort reviewed
- [ ] Reviewer names are masked
- [ ] Can filter bookings by type

---

**End of Document**
