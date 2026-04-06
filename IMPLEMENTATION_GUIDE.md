# AquaCharge Styled Frontend - Implementation Guide

## Overview

This guide explains the professional styling implementation for the AquaCharge vessel-to-grid energy management platform. The frontend has been completely redesigned with a modern maritime tech aesthetic while preserving all existing functionality.

---

## Design Philosophy

The AquaCharge styling follows a **Modern Maritime Tech** design philosophy that emphasizes:

1. **Clarity Over Decoration** – Clean, purposeful interfaces prioritizing information hierarchy
2. **Maritime Heritage** – Subtle nautical elements (water gradients, wave patterns) without being literal
3. **Dual-Role Adaptability** – Distinct visual treatments for Vessel Owner vs Port Operator dashboards
4. **Energy-Focused Visualization** – Color coding for energy states (charging, discharging, idle)
5. **Professional Confidence** – Premium typography, refined spacing, and polished interactions

---

## Color Palette

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Deep Ocean Blue | `#0F4C75` | Primary actions, headers, key metrics |
| Teal Accent | `#3282B8` | Secondary actions, highlights, links |
| Emerald Green | `#06A77D` | Success states, V2G earnings, positive metrics |
| Coral Red | `#E63946` | Alerts, errors, warnings |

### Neutral Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Dark Slate | `#1A1F2E` | Main background |
| Charcoal | `#2D3142` | Card backgrounds |
| Light Gray | `#A8B5C8` | Secondary text |
| Off-White | `#F5F7FA` | Primary text on dark backgrounds |

### CSS Variables
All colors are defined as CSS variables in `client/src/index.css`:
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
- **Display**: Poppins (Bold 700, SemiBold 600) – Headlines, metrics
- **Body**: Inter (Regular 400, Medium 500) – Body text, UI labels
- **Mono**: JetBrains Mono (Regular 400) – Technical values, IDs

### Hierarchy Rules

| Element | Size | Weight | Font | Color |
|---------|------|--------|------|-------|
| Page Title (H1) | 32px | 700 | Poppins | Foreground |
| Section Title (H2) | 24px | 600 | Poppins | Foreground |
| Subsection (H3) | 18px | 600 | Poppins | Foreground |
| Body Text | 14px | 400 | Inter | Foreground |
| Secondary Text | 14px | 400 | Inter | Muted |
| Caption | 12px | 400 | Inter | Muted |
| Metric Value | 28px | 700 | Poppins | Foreground |
| Metric Label | 12px | 500 | Inter | Muted |

---

## Component Architecture

### Core Components

#### 1. **MetricCard**
Displays KPI metrics with optional trend indicators.

**Location**: `client/src/components/MetricCard.tsx`

**Props**:
- `label` (string) – Metric label
- `value` (string | number) – Metric value
- `icon` (ReactNode) – Optional icon
- `trend` ('up' | 'down' | 'neutral') – Trend direction
- `trendValue` (string) – Trend description

**Usage**:
```tsx
<MetricCard
  label="V2G Earnings (Last 30 Days)"
  value="$1,234.56"
  icon={<TrendingUp className="h-5 w-5" />}
  trend="up"
  trendValue="+12% from last month"
/>
```

#### 2. **BookingCard**
Displays booking information with status and V2G details.

**Location**: `client/src/components/BookingCard.tsx`

**Props**:
- `id` (string | number) – Booking ID
- `chargerId` (string | number) – Charger ID
- `startTime` (string) – Start timestamp
- `endTime` (string) – End timestamp
- `status` ('confirmed' | 'pending' | 'cancelled') – Booking status
- `v2gInfo` (object) – Optional V2G transaction details

**Usage**:
```tsx
<BookingCard
  id="12345"
  chargerId="42"
  startTime="2026-04-06T10:00:00Z"
  endTime="2026-04-06T14:00:00Z"
  status="confirmed"
  v2gInfo={{
    energyDischarged: 50,
    pricePerKwh: 0.25
  }}
/>
```

#### 3. **ChargerCard**
Displays charger information with availability status.

**Location**: `client/src/components/ChargerCard.tsx`

**Props**:
- `id` (string | number) – Charger ID
- `type` (string) – Charger type
- `portId` (string | number) – Port ID
- `isAvailable` (boolean) – Availability status
- `onClick` (function) – Click handler

**Usage**:
```tsx
<ChargerCard
  id="42"
  type="DC Fast Charger"
  portId="PORT-001"
  isAvailable={true}
  onClick={() => handleChargerSelect('42')}
/>
```

#### 4. **DashboardLayout**
Provides consistent dashboard structure with sidebar navigation.

**Location**: `client/src/components/DashboardLayout.tsx`

**Props**:
- `title` (string) – Page title
- `subtitle` (string) – Optional subtitle
- `children` (ReactNode) – Page content
- `onLogout` (function) – Logout handler
- `navigation` (array) – Navigation items
- `currentPage` (string) – Current page ID
- `onNavigate` (function) – Navigation handler
- `userType` ('vessel_owner' | 'port_operator') – User type

**Usage**:
```tsx
<DashboardLayout
  title="Welcome, John"
  subtitle="Manage your vessel bookings"
  onLogout={handleLogout}
  navigation={navigationItems}
  currentPage="dashboard"
  onNavigate={handleNavigate}
  userType="vessel_owner"
>
  {/* Page content */}
</DashboardLayout>
```

### shadcn/ui Components

The project uses pre-built shadcn/ui components for consistency:

- **Button** – Primary, secondary, outline, destructive variants
- **Card** – Container with header, content, footer sections
- **Input** – Text input with label and error support
- **Badge** – Status indicators with multiple variants
- **Dialog** – Modal dialogs for confirmations
- **Select** – Dropdown selections
- **Tabs** – Tabbed content sections

**Import Pattern**:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
```

---

## Page Structure

### Authentication Pages

#### Login Page
**Location**: `client/src/pages/Login.tsx`

**Features**:
- Centered card layout with gradient background
- Email and password inputs
- Demo account quick-fill buttons
- Error message display
- Sign up link

**Styling**:
- Background: Gradient from background to card color
- Card: Charcoal background with subtle border
- Buttons: Primary (Deep Ocean Blue) and outline variants

#### Signup Page
**Location**: `client/src/pages/Signup.tsx`

**Features**:
- First and last name fields
- Email and password inputs
- Account type selection (Vessel Owner / Port Operator)
- Form validation
- Back to login link

**Styling**:
- Same gradient background as Login
- Responsive grid for name fields
- Select dropdown for account type

### Dashboard Pages

#### Vessel Owner Dashboard
**Location**: `client/src/pages/DashboardVO.tsx`

**Sections**:
1. **Metrics Grid** – V2G earnings, current price, upcoming bookings
2. **Next Bookings** – List of upcoming confirmed bookings with V2G details
3. **Navigation** – Sidebar with Dashboard, Find Chargers, My Bookings, My Vessels, Profile

**Key Features**:
- Real-time booking data loading
- V2G transaction display
- Earnings calculation (last 30 days)
- Empty state messaging
- Error handling

#### Port Operator Dashboard
**Location**: `client/src/pages/DashboardPO.tsx`

**Sections**:
1. **Metrics Grid** – Current V2G price, system status
2. **Price Management** – Form to update V2G discharge price
3. **Quick Links** – Navigation to bookings and port management

**Key Features**:
- V2G price fetching and updating
- Success/error message display
- Form validation
- Real-time price updates

---

## Styling Conventions

### Spacing System
Uses Tailwind's 4px base unit:

```
px-2 = 8px    |    gap-2 = 8px
px-3 = 12px   |    gap-3 = 12px
px-4 = 16px   |    gap-4 = 16px
px-6 = 24px   |    gap-6 = 24px
px-8 = 32px   |    gap-8 = 32px
```

### Border Radius
```
rounded-lg = 8px (standard)
rounded-md = 6px (smaller)
rounded-full = 9999px (pills)
```

### Shadows
```
shadow-sm = subtle
shadow-md = standard (cards)
shadow-lg = elevated (hover states)
```

### Transitions
```
duration-200 = 200ms (buttons, quick interactions)
duration-300 = 300ms (cards, modals)
ease-out = default easing
```

---

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Responsive Classes

```tsx
// Hide/show on breakpoints
<div className="hidden md:flex">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Items
</div>

// Responsive text size
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Heading
</h1>

// Responsive padding
<div className="px-4 md:px-6 lg:px-8">
  Content
</div>
```

### Mobile Considerations
- Sidebar converts to hamburger menu
- Cards stack vertically
- Modals use bottom-sheet style
- Touch targets minimum 44px

---

## Color Usage Guidelines

### Background Colors
- **Main Background**: `bg-background` (Dark Slate)
- **Card Background**: `bg-card` (Charcoal)
- **Input Background**: `bg-input` (rgba(255, 255, 255, 0.05))
- **Hover Background**: `bg-muted` or `bg-secondary/10`

### Text Colors
- **Primary Text**: `text-foreground` (Off-White)
- **Secondary Text**: `text-muted-foreground` (Light Gray)
- **Accent Text**: `text-secondary` (Teal) or `text-accent` (Emerald)
- **Error Text**: `text-destructive` (Coral Red)

### Border Colors
- **Standard Border**: `border-border` (rgba(255, 255, 255, 0.1))
- **Focus Border**: `border-secondary` (Teal)
- **Error Border**: `border-destructive` (Coral Red)

### Status Colors
- **Success**: Emerald Green (`text-accent`)
- **Warning**: Yellow (`text-yellow-400`)
- **Error**: Coral Red (`text-destructive`)
- **Info**: Teal (`text-secondary`)

---

## Accessibility

### Contrast Requirements
- All text must have 4.5:1 contrast ratio (WCAG AA)
- Use semantic color pairs:
  - `text-foreground` on `bg-background` ✓
  - `text-card-foreground` on `bg-card` ✓
  - `text-destructive` on `bg-destructive/10` ✓

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus rings visible on all buttons and inputs
- Tab order follows logical flow
- Escape key closes modals

### ARIA Labels
```tsx
<button aria-label="Close menu">×</button>
<div role="status" aria-live="polite">
  Loading...
</div>
```

---

## File Structure

```
client/src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   └── ... (other shadcn components)
│   ├── MetricCard.tsx
│   ├── BookingCard.tsx
│   ├── ChargerCard.tsx
│   └── DashboardLayout.tsx
├── pages/
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── DashboardVO.tsx
│   ├── DashboardPO.tsx
│   └── ... (other pages)
├── App.tsx
├── main.tsx
└── index.css (global theme)
```

---

## Development Workflow

### Adding New Pages

1. Create page component in `client/src/pages/`
2. Import `DashboardLayout` for consistency
3. Use existing components (MetricCard, BookingCard, etc.)
4. Follow color and typography guidelines
5. Add responsive breakpoints

### Creating New Components

1. Create component file in `client/src/components/`
2. Use shadcn/ui components as building blocks
3. Apply Tailwind classes for styling
4. Export component with TypeScript types
5. Document props and usage

### Styling Guidelines

1. Use CSS variables from `index.css` for colors
2. Use Tailwind utilities for spacing and layout
3. Use custom component classes for repeated patterns
4. Keep inline styles minimal
5. Use `cn()` utility for conditional classes

---

## Common Patterns

### Error Message
```tsx
import { AlertCircle } from 'lucide-react';

<div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
  <p className="text-sm text-destructive">Error message</p>
</div>
```

### Success Message
```tsx
import { CheckCircle } from 'lucide-react';

<div className="flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
  <p className="text-sm text-accent">Success message</p>
</div>
```

### Loading State
```tsx
import { Zap } from 'lucide-react';

<div className="flex items-center justify-center py-8">
  <div className="animate-spin">
    <Zap className="h-6 w-6 text-secondary" />
  </div>
  <p className="ml-3 text-muted-foreground">Loading...</p>
</div>
```

### Empty State
```tsx
import { Calendar } from 'lucide-react';

<div className="py-8 text-center">
  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
  <p className="text-muted-foreground">No bookings found</p>
  <button className="mt-4 text-secondary hover:text-secondary/80">
    Create booking →
  </button>
</div>
```

---

## Performance Optimization

### Image Optimization
- Use WebP format when possible
- Lazy-load images below the fold
- Optimize file sizes before deployment

### CSS Optimization
- Tailwind CSS is tree-shaken in production
- Only used classes are included in final bundle
- CSS variables reduce duplication

### Component Optimization
- Use React.memo for expensive components
- Memoize callbacks with useCallback
- Lazy-load pages with React.lazy

---

## Deployment Checklist

- [ ] All pages use DashboardLayout
- [ ] All buttons use Button component
- [ ] All inputs use Input component
- [ ] All status indicators use Badge component
- [ ] Error messages use destructive styling
- [ ] Success messages use accent styling
- [ ] Responsive breakpoints tested
- [ ] Mobile navigation works
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Contrast ratios meet WCAG AA
- [ ] Loading states display correctly
- [ ] Empty states have messaging
- [ ] Error handling implemented
- [ ] No console errors

---

## Support & Maintenance

### Adding New Features
1. Follow existing component patterns
2. Use established color palette
3. Maintain responsive design
4. Test on mobile, tablet, desktop
5. Ensure accessibility compliance

### Updating Styling
1. Modify `client/src/index.css` for global changes
2. Update component files for specific changes
3. Test changes across all pages
4. Verify responsive behavior
5. Check accessibility compliance

### Troubleshooting
- **Colors look wrong**: Check CSS variables in `index.css`
- **Layout broken**: Verify Tailwind classes and breakpoints
- **Components not rendering**: Check imports and component props
- **Styling not applying**: Clear browser cache and rebuild

---

## Additional Resources

- **Tailwind CSS**: https://tailwindcss.com/
- **shadcn/ui**: https://ui.shadcn.com/
- **Lucide Icons**: https://lucide.dev/
- **WCAG Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/

