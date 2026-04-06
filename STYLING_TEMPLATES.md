# AquaCharge Styling Templates & Component Guide

This document provides comprehensive styling templates and examples for the AquaCharge frontend components. All styling uses Tailwind CSS 4 with custom theme variables defined in `client/src/index.css`.

---

## Color System

### Primary Colors
- **Deep Ocean Blue** (`#0F4C75`): Primary actions, headers, key metrics
- **Teal Accent** (`#3282B8`): Secondary actions, highlights, links
- **Emerald Green** (`#06A77D`): Success states, V2G earnings, positive metrics
- **Coral Red** (`#E63946`): Alerts, errors, warnings

### Neutral Palette
- **Dark Slate** (`#1A1F2E`): Main background
- **Charcoal** (`#2D3142`): Card backgrounds
- **Light Gray** (`#A8B5C8`): Secondary text
- **Off-White** (`#F5F7FA`): Primary text on dark backgrounds

### CSS Variables
All colors are available as CSS variables in `:root`:
```css
--primary: #0F4C75;
--secondary: #3282B8;
--accent: #06A77D;
--destructive: #E63946;
--background: #1A1F2E;
--foreground: #F5F7FA;
--card: #2D3142;
--muted: #A8B5C8;
```

---

## Typography System

### Font Stack
- **Display Font**: Poppins (Bold 700, SemiBold 600) – Headlines, metrics
- **Body Font**: Inter (Regular 400, Medium 500) – Body text, UI labels
- **Mono Font**: JetBrains Mono (Regular 400) – Technical values, IDs

### Typography Hierarchy

#### Heading Styles
```tsx
// H1 - Page Title (32px, Poppins Bold)
<h1 className="text-4xl font-bold text-foreground">Welcome, John</h1>

// H2 - Section Title (24px, Poppins SemiBold)
<h2 className="text-2xl font-semibold text-foreground">Next Bookings</h2>

// H3 - Subsection (18px, Poppins Medium)
<h3 className="text-lg font-semibold text-foreground">Charger Details</h3>
```

#### Body Text
```tsx
// Regular Body (14px, Inter Regular)
<p className="text-base text-foreground">Standard body text</p>

// Secondary Text (14px, Light Gray)
<p className="text-sm text-muted-foreground">Secondary information</p>

// Caption (12px, Light Gray)
<p className="text-xs text-muted-foreground">Small caption text</p>

// Metric Value (28px, Poppins Bold)
<p className="text-3xl font-bold text-foreground">$1,234.56</p>
```

---

## Component Templates

### 1. Metric Card

Used for displaying KPI metrics on dashboards.

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function MetricCardExample() {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            V2G Earnings (Last 30 Days)
          </p>
          <p className="mt-3 text-3xl font-bold text-foreground">
            $1,234.56
          </p>
          <p className="mt-2 text-sm font-medium text-accent">
            ↑ +12% from last month
          </p>
        </div>
        <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
          <TrendingUp className="h-5 w-5 text-accent" />
        </div>
      </CardContent>
    </Card>
  );
}
```

**Styling Details:**
- Background: `bg-card` (Charcoal)
- Border: `border border-border` (subtle white with 10% opacity)
- Padding: `p-6` (24px)
- Border Radius: `rounded-lg` (8px)
- Shadow: `shadow-md` (subtle depth)

---

### 2. Booking Card

Displays booking information with status indicators.

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Zap } from 'lucide-react';

export function BookingCardExample() {
  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Booking #12345
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Charger 42
            </p>
          </div>
          <Badge variant="secondary">Confirmed</Badge>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Start: Apr 6, 2026 10:00 AM</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>End: Apr 6, 2026 2:00 PM</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-accent font-medium">
            <Zap className="h-4 w-4" />
            <span>V2G: 50 kW @ $0.25/kW</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Styling Details:**
- Hover Effect: `hover:shadow-lg transition-all duration-300`
- Status Badge: Uses `Badge` component with variants
- Icons: 16px (h-4 w-4) for inline icons
- Dividers: `border-t border-border` for visual separation

---

### 3. Button Variants

```tsx
import { Button } from '@/components/ui/button';

export function ButtonExamples() {
  return (
    <div className="space-y-4">
      {/* Primary Button */}
      <Button variant="default" className="w-full">
        Sign In
      </Button>

      {/* Secondary Button */}
      <Button variant="secondary" className="w-full">
        Create Account
      </Button>

      {/* Outline Button */}
      <Button variant="outline" className="w-full">
        Cancel
      </Button>

      {/* Destructive Button */}
      <Button variant="destructive" className="w-full">
        Delete
      </Button>

      {/* Ghost Button */}
      <Button variant="ghost">
        Skip
      </Button>

      {/* Link Button */}
      <Button variant="link">
        Learn more →
      </Button>

      {/* Size Variants */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}
```

**Button Styling:**
- Default: Deep Ocean Blue background with Off-White text
- Hover: 10% brightness increase
- Disabled: 60% opacity
- Transitions: 200ms ease-out

---

### 4. Input Field

```tsx
import { Input } from '@/components/ui/input';

export function InputExample() {
  return (
    <Input
      type="email"
      placeholder="Enter your email"
      label="Email Address"
    />
  );
}
```

**Input Styling:**
- Background: `bg-input` (rgba(255, 255, 255, 0.05))
- Border: `border border-border` (rgba(255, 255, 255, 0.1))
- Focus: Teal border with ring effect
- Padding: `px-4 py-2`
- Placeholder: Light Gray at 70% opacity

---

### 5. Badge Status Indicators

```tsx
import { Badge } from '@/components/ui/badge';

export function BadgeExamples() {
  return (
    <div className="space-y-2">
      {/* Default */}
      <Badge variant="default">Default</Badge>

      {/* Secondary */}
      <Badge variant="secondary">Confirmed</Badge>

      {/* Destructive */}
      <Badge variant="destructive">Cancelled</Badge>

      {/* Outline */}
      <Badge variant="outline">Pending</Badge>
    </div>
  );
}
```

**Badge Styling:**
- Padding: `px-3 py-1`
- Font Size: `text-xs`
- Border Radius: `rounded-full`
- Font Weight: `font-semibold`

---

### 6. Dashboard Layout

```tsx
import DashboardLayout from '@/components/DashboardLayout';

export function DashboardExample() {
  const navigation = [
    { label: 'Dashboard', id: 'dashboard' },
    { label: 'Bookings', id: 'bookings' },
    { label: 'Settings', id: 'settings' },
  ];

  return (
    <DashboardLayout
      title="Welcome, John"
      subtitle="Manage your bookings"
      onLogout={() => console.log('logout')}
      navigation={navigation}
      currentPage="dashboard"
      onNavigate={(page) => console.log(page)}
      userType="vessel_owner"
    >
      {/* Page content goes here */}
      <div>Your dashboard content</div>
    </DashboardLayout>
  );
}
```

**Layout Structure:**
- Fixed Sidebar: 224px width (w-56) on desktop
- Main Content: Flex-grow with max-width 1280px
- Responsive: Hamburger menu on mobile
- Padding: 32px (p-8) on desktop, 24px on tablet

---

### 7. Alert/Error Message

```tsx
import { AlertCircle } from 'lucide-react';

export function ErrorMessageExample() {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">
        Unable to process your request. Please try again.
      </p>
    </div>
  );
}
```

**Alert Styling:**
- Background: `bg-destructive/10` (10% opacity)
- Border: `border border-destructive/20` (20% opacity)
- Icon: 20px (h-5 w-5)
- Padding: `p-4` (16px)
- Border Radius: `rounded-lg` (8px)

---

### 8. Success Message

```tsx
import { CheckCircle } from 'lucide-react';

export function SuccessMessageExample() {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
      <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
      <p className="text-sm text-accent">
        Your price has been updated successfully!
      </p>
    </div>
  );
}
```

**Success Styling:**
- Background: `bg-accent/10` (10% opacity)
- Border: `border border-accent/20` (20% opacity)
- Text Color: `text-accent` (Emerald Green)

---

### 9. Grid Layouts

#### 3-Column Metric Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <MetricCard label="Earnings" value="$1,234.56" />
  <MetricCard label="Price" value="$0.25/kW" />
  <MetricCard label="Bookings" value="5" />
</div>
```

#### 2-Column Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <BookingCard {...booking1} />
  <BookingCard {...booking2} />
  <BookingCard {...booking3} />
</div>
```

**Grid Spacing:**
- Gap: `gap-6` (24px) for metric grids
- Gap: `gap-4` (16px) for booking/charger grids
- Responsive: 1-column on mobile, 2-3 columns on larger screens

---

## Animation & Interaction

### Hover Effects

```tsx
// Card Hover
<div className="hover:shadow-lg hover:scale-102 transition-all duration-300">
  Content
</div>

// Button Hover
<button className="hover:brightness-110 transition-all duration-200">
  Click me
</button>

// Link Hover
<a className="hover:text-secondary/80 transition-colors">
  Link text
</a>
```

### Loading States

```tsx
import { Zap } from 'lucide-react';

export function LoadingExample() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin">
        <Zap className="h-6 w-6 text-secondary" />
      </div>
      <p className="ml-3 text-muted-foreground">Loading...</p>
    </div>
  );
}
```

### Transitions

```css
/* 200ms for button interactions */
transition-all duration-200

/* 300ms for card/modal animations */
transition-all duration-300

/* Color transitions */
transition-colors

/* Easing functions */
ease-out (default)
ease-in-out
```

---

## Responsive Design

### Breakpoints
- **Mobile**: < 640px (single column, stacked)
- **Tablet**: 640px - 1024px (2-column grids)
- **Desktop**: > 1024px (3-column grids, fixed sidebar)

### Responsive Classes

```tsx
// Show/Hide on breakpoints
<div className="hidden md:flex">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Items
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Heading
</h1>

// Responsive padding
<div className="px-4 md:px-6 lg:px-8">
  Content
</div>
```

---

## Spacing System

All spacing uses Tailwind's spacing scale (4px base unit):

```
px-2 = 8px
px-3 = 12px
px-4 = 16px
px-6 = 24px
px-8 = 32px

py-2 = 8px
py-3 = 12px
py-4 = 16px
py-6 = 24px
py-8 = 32px

gap-2 = 8px
gap-3 = 12px
gap-4 = 16px
gap-6 = 24px
```

---

## Accessibility Guidelines

### Color Contrast
- All text must have 4.5:1 contrast ratio minimum
- Use `text-foreground` on `bg-background` (passes WCAG AA)
- Use `text-card-foreground` on `bg-card` (passes WCAG AA)

### Focus States
```tsx
<button className="focus-visible:ring-2 focus-visible:ring-secondary/50">
  Accessible button
</button>
```

### Semantic HTML
```tsx
// Good
<button onClick={handleClick}>Action</button>
<a href="/page">Link</a>
<input type="email" />

// Avoid
<div onClick={handleClick}>Action</div>
<div role="button">Action</div>
```

### ARIA Labels
```tsx
<button aria-label="Close menu">×</button>
<div role="status" aria-live="polite">
  Loading...
</div>
```

---

## Implementation Checklist

- [ ] All pages use `DashboardLayout` for consistent structure
- [ ] Metric cards use `MetricCard` component
- [ ] Bookings use `BookingCard` component
- [ ] All buttons use `Button` component with appropriate variant
- [ ] All inputs use `Input` component
- [ ] Status indicators use `Badge` component
- [ ] Error messages use destructive styling
- [ ] Success messages use accent styling
- [ ] Responsive grids use proper breakpoints
- [ ] All interactive elements have hover/focus states
- [ ] Loading states show spinner animation
- [ ] Empty states show appropriate messaging
- [ ] All text meets WCAG AA contrast requirements
- [ ] Keyboard navigation works throughout app

---

## Quick Reference

| Element | Component | Variant | Color |
|---------|-----------|---------|-------|
| Primary Button | Button | default | Primary |
| Secondary Button | Button | secondary | Secondary |
| Danger Button | Button | destructive | Destructive |
| Metric Card | Card | - | Card |
| Booking Card | Card | - | Card |
| Success Badge | Badge | secondary | Secondary |
| Error Badge | Badge | destructive | Destructive |
| Pending Badge | Badge | outline | Outline |
| Metric Label | Text | - | Muted |
| Metric Value | Text | - | Foreground |
| Body Text | Text | - | Foreground |
| Secondary Text | Text | - | Muted |

