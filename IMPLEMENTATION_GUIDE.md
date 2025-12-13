
# Quick Start: Implement High-Impact Features This Week

## 🎯 Goal

Transform ResortifyPH from "MVP" to "production-ready" by addressing critical gaps

---


## Week 1: Quick Wins (All Can Be Done in Parallel)

### Task 2: Map-Based Location Picker & Address Cleaning (3 days)

**Impact:** High | **Difficulty:** Medium

#### Step 1: Add LocationPicker component

- Use `react-leaflet` for interactive map
- Allow users to search for addresses (Nominatim API)
- Clean address results to English/Latin only
- Show "No results found" if search is empty
- Allow pinning by clicking map or dragging marker
- Auto-fill address field and clean non-Latin characters
- Map zooms/pans to selected search or pin

#### Step 2: Integrate in Create/Edit Resort Pages

- Use `<LocationPicker />` in `/owner/create-resort/page.tsx` and `/owner/edit-resort/[id]/index.tsx`
- Pass latitude, longitude, and address state
- Handle onLocationChange and onAddressChange

#### Step 3: Test User Experience

- Search for a location, select a result, and verify map zooms
- Pin a location by clicking or dragging marker
- Ensure address field is always cleaned and in English

**Expected result:** Seamless, modern location selection for resorts

### Task 1: Form Validation + Error Feedback (3 days)

**Impact:** High | **Difficulty:** Easy

#### Step 1: Install dependencies

```bash
npm install react-hook-form zod @hookform/resolvers sonner
```

#### Step 2: Create validation schema file

Create `lib/validations.ts`:

```typescript
import { z } from "zod";

export const createResortSchema = z.object({
  name: z
    .string()
    .min(5, "Resort name must be at least 5 characters")
    .max(100, "Resort name too long"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description too long"),
  location: z.string().min(3, "Location required"),
  price: z
    .number()
    .min(500, "Price must be at least ₱500")
    .max(999999, "Price too high"),
  capacity: z
    .number()
    .min(1, "Must accommodate at least 1 guest")
    .max(100, "Cannot exceed 100 guests"),
  contact_number: z
    .string()
    .regex(/^\+?63\d{9,10}$|^\d{10}$/, "Invalid Philippine phone number"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password needs uppercase letter")
    .regex(/[0-9]/, "Password needs a number"),
  full_name: z.string().min(2, "Full name required"),
});

export const bookingSchema = z
  .object({
    dateFrom: z
      .date()
      .refine((d) => d > new Date(), "Check-in must be in future"),
    dateTo: z.date(),
    guests: z.number().min(1),
  })
  .refine((data) => data.dateTo > data.dateFrom, {
    message: "Check-out must be after check-in",
    path: ["dateTo"],
  });
```

#### Step 3: Update create-resort form

File: `app/owner/create-resort/page.tsx`

Find the form section and replace with:

```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createResortSchema } from "@/lib/validations";
import { toast } from "sonner";

export default function CreateResortPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createResortSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      price: 5000,
      capacity: 4,
    },
  });

  const onSubmit = async (data) => {
    try {
      const { error } = await supabase.from("resorts").insert({
        owner_id: userId,
        ...data,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Resort created! Awaiting admin approval");
      // redirect to /owner/my-resorts
    } catch (error) {
      toast.error(error.message || "Failed to create resort");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Name field */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">🏨 Resort Name *</label>
        <input
          {...register("name")}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-resort-500"
          placeholder="e.g., Sunset Beachfront Resort"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Price field */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">
          💰 Nightly Price (₱) *
        </label>
        <input
          {...register("price", { valueAsNumber: true })}
          type="number"
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-resort-500"
          placeholder="5000"
        />
        {errors.price && (
          <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
        )}
      </div>

      {/* Contact field */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">
          📱 Contact Number *
        </label>
        <input
          {...register("contact_number")}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-resort-500"
          placeholder="+63912345678 or 09123456789"
        />
        {errors.contact_number && (
          <p className="text-red-500 text-sm mt-1">
            {errors.contact_number.message}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating Resort..." : "Create Resort"}
      </button>
    </form>
  );
}
```

#### Files to Update (Same Pattern):

1. `app/auth/register/page.tsx` - Use `signupSchema`
2. `app/resorts/[id]/page.tsx` - Use `bookingSchema` for date validation
3. `app/profile/page.tsx` - Profile update validation

**Time:** 2-3 hours

---

### Task 2: Add Stripe Payment Integration (5 days)

#### Step 1: Install Stripe

```bash
npm install stripe @stripe/react-js
```

#### Step 2: Create Stripe API endpoints

Create `app/api/stripe/create-payment-intent/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { bookingId, amount, currency = "PHP" } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: { bookingId },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Create `app/api/stripe/webhooks/route.ts`:

```typescript
import { Stripe } from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return NextResponse.json(
      { error: "Webhook signature failed" },
      { status: 400 }
    );
  }

  if (event.type === "payment_intent.succeeded") {
    const { metadata, id: paymentIntentId } = event.data
      .object as Stripe.PaymentIntent;
    const { bookingId } = metadata as any;

    // Update booking status to 'confirmed'
    await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_id: paymentIntentId,
        payment_status: "completed",
      })
      .eq("id", bookingId);
  }

  return NextResponse.json({ received: true });
}
```

#### Step 3: Create Payment Component

Create `components/StripePaymentForm.tsx`:

```typescript
"use client";
import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-js";
import { toast } from "sonner";

export function StripePaymentForm({ bookingId, amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      // Create payment intent
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        body: JSON.stringify({ bookingId, amount }),
      });
      const { clientSecret } = await res.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success("Payment successful!");
        onSuccess();
      }
    } catch (error) {
      toast.error("Payment failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="p-6 border rounded-lg">
      <h3 className="font-bold mb-4">Payment Details</h3>

      <div className="mb-6 p-4 border border-slate-200 rounded">
        <CardElement
          options={{
            style: {
              base: { fontSize: "16px" },
            },
          }}
        />
      </div>

      <button
        disabled={!stripe || isLoading}
        className="w-full py-3 bg-resort-500 text-white rounded-lg font-bold disabled:opacity-50"
      >
        {isLoading ? "Processing..." : `Pay ₱${amount.toLocaleString()}`}
      </button>
    </form>
  );
}
```

#### Step 4: Update Booking Page

Modify `app/resorts/[id]/page.tsx` to include payment:

```typescript
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-js";
import { StripePaymentForm } from "@/components/StripePaymentForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

export default function ResortDetail() {
  // ... existing code ...

  const handlePayment = async () => {
    // Calculate total cost
    const nights = Math.ceil(
      (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)
    );
    const cleaningFee = 500;
    const tax = (price * nights + cleaningFee) * 0.12;
    const totalCost = price * nights + cleaningFee + tax;

    // Show payment form
    setShowPayment(true);
    setTotalCost(totalCost);
  };

  return (
    <>
      {/* ... existing UI ... */}

      {showPayment && (
        <Elements stripe={stripePromise}>
          <StripePaymentForm
            bookingId={bookingId}
            amount={totalCost}
            onSuccess={() => {
              toast.success("Booking confirmed!");
              router.push("/guest/bookings");
            }}
          />
        </Elements>
      )}
    </>
  );
}
```

#### Environment Variables Needed:

```env
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

**Time:** 4-5 hours

---

### Task 3: Add Calendar Component (3 days)

#### Step 1: Install calendar library

```bash
npm install react-big-calendar date-fns
```

#### Step 2: Create Availability Calendar

Create `components/AvailabilityCalendar.tsx`:

```typescript
"use client";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, subDays } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export function AvailabilityCalendar({ resortId }) {
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch bookings for this resort
    supabase
      .from("bookings")
      .select("*")
      .eq("resort_id", resortId)
      .in("status", ["confirmed", "pending"])
      .then(({ data }) => {
        if (data) {
          const calendarEvents = data.map((booking) => ({
            id: booking.id,
            title: "Booked",
            start: new Date(booking.date_from),
            end: new Date(booking.date_to),
            resource: booking,
          }));
          setEvents(calendarEvents);
        }
      });
  }, [resortId]);

  return (
    <div className="h-96 bg-white border rounded-lg p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        eventPropGetter={() => ({
          className: "bg-red-500 text-white",
          style: { borderRadius: "4px", opacity: 0.8 },
        })}
      />
    </div>
  );
}
```

#### Step 3: Add Date Range Picker for Guests

Create `components/DateRangePicker.tsx`:

```typescript
"use client";
import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export function DateRangePicker({ onSelect, bokedDates = [] }) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const isDateBlocked = (date) => {
    return bookedDates.some((booking) => {
      const start = new Date(booking.date_from);
      const end = new Date(booking.date_to);
      return date >= start && date <= end;
    });
  };

  const handleSelect = () => {
    if (startDate && endDate) {
      onSelect(startDate, endDate);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-4">📅 Select Dates</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-slate-600">Check-in</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            filterDate={(date) => !isDateBlocked(date) && date > new Date()}
            minDate={new Date()}
            className="w-full px-3 py-2 border border-slate-200 rounded"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Check-out</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            filterDate={(date) => !isDateBlocked(date)}
            minDate={startDate || new Date()}
            className="w-full px-3 py-2 border border-slate-200 rounded"
          />
        </div>
      </div>

      <button
        onClick={handleSelect}
        disabled={!startDate || !endDate}
        className="w-full px-4 py-2 bg-resort-500 text-white rounded disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
```

**Time:** 2-3 hours

---

## 🎯 Priority Order

Do in this order for maximum impact:

1. **Form Validation** (3 days) - Makes app feel professional
2. **Payment Integration** (5 days) - Enables monetization
3. **Calendar Component** (3 days) - Improves UX significantly
4. **Loading States** (1 day) - Polish
5. **Error Messages** (1 day) - Better UX

**Total: ~2 weeks** for these critical improvements

---

## 📋 Testing Checklist

After implementing each feature:

- [ ] Form shows validation errors immediately
- [ ] Error messages are clear and helpful
- [ ] Payment succeeds with test card: `4242 4242 4242 4242`
- [ ] Calendar loads without errors
- [ ] Selected dates appear correctly
- [ ] Booked dates are highlighted
- [ ] Mobile view works well
- [ ] All buttons show loading states
- [ ] No console errors

---

## 🚀 Next Steps After Week 1

**Week 2-3:**

- Reviews & ratings system
- Guest messaging

**Week 4:**

- Admin moderation dashboard
- Host analytics

**Week 5+:**

- Mobile optimization
- Performance tuning
- Beta testing

---

**Questions?** These examples are ready to use - just copy/paste and customize for your specific needs.
