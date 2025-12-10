# ResortifyPH Design System Guide

## Color System

### Primary Gradient

```css
background: linear-gradient(to right, #resort-500, #blue-500, #resort-600);
```

Used for: Main CTAs, primary buttons, header gradients

### Secondary Gradients

- **Success (Green):** `from-green-500 to-emerald-500`
- **Admin (Purple):** `from-purple-500 to-indigo-500`
- **Danger (Red):** `from-red-500 to-pink-500`
- **Action (Orange):** `from-orange-500 to-red-500`
- **Guest (Cyan):** `from-cyan-500 to-blue-600`

### Background Colors

- **Primary BG:** `from-slate-50 to-white` (page backgrounds)
- **Card BG:** `white` with `border-2 border-slate-200`
- **Status BGs:**
  - Pending: `from-yellow-50` / `bg-yellow-100` text
  - Approved: `from-green-50` / `bg-green-100` text
  - Rejected: `from-red-50` / `bg-red-100` text

## Component Patterns

### Buttons

**Primary Button (CTA)**

```tsx
className =
  "px-6 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-resort-400";
```

**Secondary Button**

```tsx
className =
  "px-6 py-3 border-2 border-slate-300 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-400 transition-all";
```

**Action Button (Approve/Confirm)**

```tsx
className =
  "px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-green-400";
```

### Cards

**Standard Card**

```tsx
className =
  "bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-resort-400 transition-all";
```

**Gradient Card**

```tsx
className =
  "bg-gradient-to-br from-[color]-50 to-[color]-100 border-2 border-[color]-200 rounded-2xl p-6 shadow-sm";
```

### Input Fields

**Text Input**

```tsx
className =
  "w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors";
```

**Select Dropdown**

```tsx
className =
  "w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white shadow-sm hover:border-slate-300 transition-colors cursor-pointer";
```

### Labels

**Input Label with Emoji**

```tsx
className = "flex items-center gap-2 text-sm font-bold text-slate-700 mb-2";
```

```tsx
<label>
  <span>📧</span>
  <span>Email Address</span>
</label>
```

### Badges & Status Indicators

**Status Badge - Pending**

```tsx
className =
  "text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg font-bold border-2 border-yellow-300";
```

**Status Badge - Approved**

```tsx
className =
  "text-xs bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold border-2 border-green-300";
```

**Status Badge - Rejected**

```tsx
className =
  "text-xs bg-red-100 text-red-800 px-3 py-1 rounded-lg font-bold border-2 border-red-300";
```

### Headers

**Section Header with Emoji**

```tsx
<div className="flex items-center gap-3 mb-6">
  <span className="text-5xl">🏝️</span>
  <h1 className="text-5xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">
    Page Title
  </h1>
</div>
```

**Subtitle**

```tsx
<p className="text-lg text-slate-600 ml-20">Description text</p>
```

### Link/Group Hover Effect

```tsx
className =
  "group bg-white border-2 border-slate-200 rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all";
```

**With group hover effects:**

```tsx
<div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🌴</div>
<span className="inline-block text-sm font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-4 py-2 rounded-lg">
  Action →
</span>
```

## Typography

### Font Weights

- **Bold/Heavy:** `font-bold` (headings, button text, labels)
- **Semibold:** `font-semibold` (subheadings, accents)
- **Normal:** default (body text)

### Font Sizes & Hierarchy

- **Page Title:** `text-5xl font-bold`
- **Section Title:** `text-3xl font-bold`
- **Card Title:** `text-lg font-bold` to `text-2xl font-bold`
- **Label:** `text-sm font-bold`
- **Body:** `text-sm text-slate-700` to `text-lg text-slate-600`

### Gradient Text

```tsx
className =
  "bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent";
```

## Spacing Standards

### Padding

- **Input/Select:** `px-5 py-3` (text input), `px-4 py-3.5` (select)
- **Button:** `px-6 py-3` (small), `px-6 py-4` (large)
- **Card Content:** `p-6` to `p-8`
- **Page Content:** `py-12` to `py-10`

### Margins

- **Page Top/Bottom:** `py-12`
- **Section Spacing:** `mb-10` to `mb-12`
- **Component Spacing:** `mb-4` to `mb-6`
- **Between items:** `gap-3` to `gap-6`

### Border Radius

- **Cards:** `rounded-2xl` or `rounded-3xl`
- **Inputs/Buttons:** `rounded-xl`
- **Small Elements:** `rounded-lg`

## Shadow & Elevation

### Shadow Levels

- **Default Card:** `shadow-sm` (light, minimal)
- **Hover Card:** `shadow-lg` (elevated)
- **Prominent Card:** `shadow-2xl` (very elevated)
- **Form Container:** `shadow-lg` (card-like)

### Hover Effects

```tsx
className = "hover:shadow-lg hover:-translate-y-0.5 transition-all";
```

- Lift effect: `-translate-y-0.5` to `-translate-y-1`
- Shadow enhancement: `shadow-sm` → `shadow-lg`
- Border color change: `border-slate-200` → `border-resort-400`

## Responsive Design Patterns

### Grid Layouts

- **2 Column:** `grid md:grid-cols-2`
- **3 Column:** `grid md:grid-cols-3`
- **4 Column:** `grid md:grid-cols-4`

### Padding Scale

- **Mobile:** `px-4` (tight)
- **Tablet:** `sm:px-6` (medium)
- **Desktop:** `lg:px-8` (spacious)

### Container Width

```tsx
className = "max-w-7xl mx-auto"; // Full width pages
className = "max-w-3xl mx-auto"; // Form pages
```

## Emoji System

### Header Emojis

- Home/Landing: 🏝️
- Explore: 🌴
- Dashboard: 🏯
- Bookings: 📬
- Admin: ⚖️
- Create: 🏗️

### Label Emojis

- Email: 📧
- Name: 📝
- Type: 🏨
- Location: 📍
- Price: 💰
- Guests: 👥
- Amenities: ✨

### Status Emojis

- Pending: ⏳
- Approved/Confirmed: ✅
- Rejected: ❌
- Info: ℹ️

## Animation Principles

### Transitions

- **Standard:** `transition-all` (colors, shadows, transforms)
- **Fast:** `.15s` to `.2s`
- **Smooth:** Ease-in-out timing

### Hover Effects

- **Scale:** `group-hover:scale-110` (10% growth)
- **Translate:** `group-hover:translate-x-2` or `-translate-y-0.5`
- **Color:** `group-hover:text-resort-600`
- **Shadow:** `group-hover:shadow-lg`

## Best Practices

1. **Consistency:** Use the same component patterns across pages
2. **Spacing:** Maintain consistent gaps and padding
3. **Colors:** Use predefined gradients, avoid one-off colors
4. **Typography:** Follow the hierarchy system
5. **Shadows:** Use shadow levels appropriately
6. **Hover:** Always provide visual feedback on interactive elements
7. **Mobile:** Test all components on mobile devices
8. **Emojis:** Use for visual clarity, not excessive decoration
9. **Borders:** Use border-2 for important UI elements
10. **Focus:** Ensure all interactive elements have visible focus states

## Color Reference

### Tailwind Colors Used

- `resort-500`, `resort-600` (cyan-based, custom color)
- `blue-500`, `blue-600`
- `slate-50`, `slate-100`, `slate-200`, `slate-300`, `slate-600`, `slate-700`, `slate-900`
- `green-100`, `green-500`, `green-600`, `emerald-500`
- `yellow-100`, `yellow-300`, `yellow-600`, `yellow-800`
- `red-100`, `red-300`, `red-500`, `red-600`, `pink-500`
- `purple-500`, `purple-600`, `indigo-500`
- `orange-400`, `orange-500`
- `cyan-500`

## Quick Component Copy-Paste

### Complete Button Component

```tsx
<button className="px-6 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-resort-400">
  Button Text
</button>
```

### Complete Card Component

```tsx
<div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-resort-400 transition-all">
  <h3 className="text-lg font-bold text-slate-900 mb-2">Card Title</h3>
  <p className="text-slate-600 mb-4">Card content goes here</p>
</div>
```

### Complete Input Component

```tsx
<label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
  <span>📧</span>
  <span>Email</span>
</label>
<input
  className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors"
  placeholder="your@email.com"
/>
```
