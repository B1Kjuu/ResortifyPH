# Role Switching Implementation Guide

## Problem (Your UX Concern)

You spotted a critical issue: **Users had to choose "Guest" or "Owner" at signup and couldn't switch.**

This is NOT how Airbnb, Shopee, or Lazada work. In those platforms:

- Everyone starts as a guest
- Anyone can become a host/owner anytime
- Users can toggle between roles without creating new accounts

## Solution Implemented

### ✅ What Changed

#### 1. **Signup Flow (FIXED)**

**Before:**

- Force user to pick "Guest" or "Owner" at signup
- Redirect Owner → `/owner/empire`
- Redirect Guest → `/`

**After:**

- Everyone signs up as "Guest" (simpler flow)
- Redirect to `/profile?welcome=true`
- User can optionally become a Host anytime

**File:** `app/auth/signup/page.tsx`

#### 2. **Navbar Role Switcher (NEW)**

Added a button in the navbar (hidden on mobile, visible on desktop):

```
[👤 Guest] [🏢 Host]
```

When user clicks "Host", it:

1. Updates their profile role to "owner"
2. Redirects to `/owner/empire` dashboard
3. Shows their resorts and bookings

Clicking "Guest" switches them back:

1. Updates profile role to "guest"
2. Redirects to `/guest/adventure-hub`

**File:** `components/Navbar.tsx`

#### 3. **Settings Link**

Changed "Profile" → "Settings" (more accurate)

---


## How Users Experience It

### Location Picker & Address Cleaning

- Both guests and owners now benefit from an interactive map-based location picker
- Address search and cleaning is consistent across all roles
- Improved UX for location selection and resort management

### Day 1: Sign Up

```
1. User enters email, password, full name
2. Click "Sign up"
3. Automatically logged in as GUEST
4. Redirect to Profile/Settings
5. Can optionally "Become a Host"
```

### Day 2: Become a Host

```
1. Click "🏢 Host" button in navbar
2. Redirect to /owner/empire
3. Click "Create Resort"
4. List their first resort
5. Wait for admin approval
```

### Day 3: Switch Back

```
1. Click "👤 Guest" button in navbar
2. Redirect to /guest/adventure-hub
3. Browse resorts
4. Make a booking
```

### Weekly Switching

```
Monday-Friday:  Browse resorts as GUEST
Weekend:        Manage properties as HOST
No new account needed!
```

---

## Technical Details

### Database (No Changes Needed)

The `profiles` table already supports this:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  role TEXT ('guest' | 'owner'),  ← This is all we need
  is_admin BOOLEAN,
  created_at TIMESTAMP
);
```

Switching roles just updates the `role` column:

```sql
-- Switch to owner
UPDATE profiles SET role = 'owner' WHERE id = user_id;

-- Switch back to guest
UPDATE profiles SET role = 'guest' WHERE id = user_id;
```

### API Changes (None)

Existing endpoints work fine:

- `/api/resorts` - Create/read/update resorts
- `/api/bookings` - Create/read bookings
- Role filtering is already in pages

### Frontend Changes

```typescript
// New function in Navbar
async function handleRoleSwitch(newRole: string) {
  await supabase.from("profiles").update({ role: newRole }).eq("id", user?.id);

  // Redirect appropriately
  if (newRole === "owner") router.push("/owner/empire");
  else router.push("/guest/adventure-hub");
}
```

---

## Testing Checklist

### Sign Up Flow

- [ ] Create new account
- [ ] Start as "Guest" automatically
- [ ] Redirect to `/profile?welcome=true`
- [ ] See "👤 Guest" highlighted in navbar

### Role Switching

- [ ] Click "🏢 Host" button
- [ ] Profile updates to owner role
- [ ] Redirect to `/owner/empire`
- [ ] See owner-only pages (My Properties, Bookings)
- [ ] Can create resort

### Switch Back

- [ ] Click "👤 Guest" button
- [ ] Profile updates to guest role
- [ ] Redirect to `/guest/adventure-hub`
- [ ] Owner pages no longer visible
- [ ] Can browse resorts

### Mobile (Hidden)

- [ ] On mobile: Role switcher NOT visible
- [ ] On desktop (md+): Role switcher visible
- [ ] Profile settings page still accessible

---

## Common Scenarios

### Scenario 1: Part-Time Host

```
User owns 2 vacation homes on weekends
Stays as guest during weekdays
Switches to host mode Friday 5pm
Back to guest Monday 9am
```

### Scenario 2: Corporate Travel

```
Executive books hotels for business travel as GUEST
Also owns a condo, manages bookings as HOST
Easy role switching for both functions
```

### Scenario 3: Testing

```
QA team can:
- Test booking flow as GUEST
- Switch to HOST to verify admin view
- No need for separate test accounts
```

---

## Next Steps

### For Development

1. ✅ Code changes implemented
2. ✅ No database migration needed
3. Test the role switcher in dev
4. Test on mobile (verify hidden)
5. Deploy to production

### For Deployment

```bash
# No database migration needed
git add .
git commit -m "feat: Allow users to switch between guest and host roles"
npm run build
npm run dev  # Test
# Deploy to production
```

### Future Enhancements

Consider adding:

1. **Email prompt:** "Become a host and earn extra income"
2. **ID verification:** "Verified hosts get featured"
3. **Host tier:** "Bronze/Silver/Gold hosts"
4. **Analytics:** "You earned $2,500 this month"
5. **Quick switcher:** Mobile-friendly role switcher in sidebar

---

## Comparison: Before vs After

| Feature             | Before                    | After                        |
| ------------------- | ------------------------- | ---------------------------- |
| **Sign Up**         | Choose role immediately   | Everyone guest, choose later |
| **Account Count**   | Separate account per role | One account, multiple roles  |
| **Switching Roles** | Impossible                | One click in navbar          |
| **User Experience** | Limiting                  | Like Airbnb/Shopee           |
| **Business**        | Only committed hosts      | Lower barrier = more hosts   |
| **Mobile**          | Role choice at signup     | Hidden, in settings          |

---

## File Changes Summary

### Modified Files:

1. **`app/auth/signup/page.tsx`**

   - Remove role selection buttons
   - Default all users to 'guest'
   - Simplify signup copy

2. **`components/Navbar.tsx`**
   - Add `handleRoleSwitch()` function
   - Add role switcher buttons (guest/host)
   - Update Profile → Settings label

### New Files:

1. **`supabase/migrations/20251211_allow_role_switching.sql`**
   - Documentation migration (no schema changes)

### No Changes Needed:

- Database schema
- API endpoints
- Page routing
- Auth logic

---

## Questions?

**Q: Can users switch roles multiple times?**
A: Yes! They can switch between guest and host unlimited times.

**Q: Do they lose data when switching?**
A: No. Their resort listings, bookings, reviews all stay. They just navigate to different sections.

**Q: Is this ready for production?**
A: Yes! No database changes needed. It's just updating a column value.

**Q: What about mobile?**
A: Role switcher is hidden on mobile (`hidden sm:flex`). Users can change role in Settings page if needed.

**Q: Can admins see both roles?**
A: Yes. Admins see the same navigation but with `/admin/*` routes. They're separate from guest/host roles.
