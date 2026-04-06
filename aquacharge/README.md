# AquaCharge - Professional Marine Charging Platform

A modern, professionally styled frontend for the AquaCharge vessel-to-grid energy management platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or higher
- npm or pnpm package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/cvadurea/SWE4213-Aquacharge.git
cd SWE4213-Aquacharge/aquacharge

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
aquacharge/
├── public/                          # Static assets
│   ├── __manus__/                  # Debug utilities
│   └── .gitkeep
├── src/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (60+)
│   │   ├── BookingCard.tsx         # Booking display component
│   │   ├── ChargerCard.tsx         # Charger display component
│   │   ├── DashboardLayout.tsx     # Main dashboard layout
│   │   ├── MetricCard.tsx          # KPI metric display
│   │   ├── ErrorBoundary.tsx       # Error handling
│   │   ├── Map.tsx                 # Google Maps integration
│   │   └── ...                     # Other components
│   ├── pages/
│   │   ├── Login.tsx               # Authentication
│   │   ├── Signup.tsx              # User registration
│   │   ├── DashboardVO.tsx         # Vessel owner dashboard
│   │   ├── DashboardPO.tsx         # Port operator dashboard
│   │   ├── FindChargers.tsx        # Charger discovery
│   │   ├── MyVessels.tsx           # Fleet management
│   │   ├── MyBookings.tsx          # Booking history
│   │   ├── Home.tsx                # Home page
│   │   └── NotFound.tsx            # 404 page
│   ├── contexts/
│   │   └── ThemeContext.tsx        # Theme provider
│   ├── hooks/
│   │   ├── useMobile.tsx           # Mobile detection
│   │   ├── useComposition.ts       # Composition utilities
│   │   └── usePersistFn.ts         # Persistent functions
│   ├── lib/
│   │   └── utils.ts                # Utility functions
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # React entry point
│   ├── index.css                   # Global styles
│   ├── const.ts                    # Application constants
│   └── assets/                     # Image assets
├── index.html                      # HTML template
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.node.json              # Node.js TypeScript config
├── vite.config.ts                  # Vite configuration
├── components.json                 # shadcn/ui configuration
└── .prettierrc                     # Code formatting

```

## 🎨 Design System

### Colors
- **Primary**: Deep Ocean Blue (#0369A1)
- **Secondary**: Teal (#0891B2)
- **Accent**: Emerald Green (#059669)
- **Destructive**: Coral Red (#DC2626)
- **Neutrals**: Slate scale (50-950)

### Typography
- **Display**: Poppins (600, 700 weights)
- **Body**: Inter (400, 500, 600, 700 weights)
- **Mono**: JetBrains Mono (400 weight)

### Components
- 60+ shadcn/ui components
- Fully accessible (WCAG 2.1 AA)
- TypeScript support
- Responsive design

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Build
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run check            # TypeScript type checking
npm run format           # Format code with Prettier

# Linting (if configured)
npm run lint             # Run ESLint
```

## 🔗 Backend Integration

The frontend connects to the following backend services:

### Environment Variables

```env
VITE_PORT_API_URL=http://localhost:3006
VITE_FLEET_API_URL=http://localhost:3004
VITE_BOOKING_API_URL=http://localhost:3003
```

### API Endpoints

**Authentication:**
- `POST /login` – User login
- `POST /register` – User registration

**Fleet Management:**
- `GET /vessels/{userId}` – Get user vessels
- `POST /vessels` – Create new vessel
- `PUT /vessels/{id}` – Update vessel
- `DELETE /vessels/{id}` – Delete vessel

**Port & Charger Discovery:**
- `GET /ports` – Get all ports
- `GET /ports/{portId}/chargers` – Get chargers at port
- `GET /chargers/{id}` – Get charger details

**Bookings:**
- `POST /bookings` – Create booking
- `GET /bookings/user/{userId}` – Get user bookings
- `GET /bookings/{id}` – Get booking details
- `PUT /bookings/{id}` – Update booking
- `DELETE /bookings/{id}` – Cancel booking

**V2G Management:**
- `GET /v2g/price` – Get current V2G price
- `PUT /v2g/price` – Update V2G price
- `GET /v2g/transactions` – Get V2G transaction history

## 👥 User Types

### Vessel Owner
- Browse available chargers
- Manage vessel fleet
- Create and manage bookings
- View booking history
- Monitor V2G earnings
- Dashboard with KPIs

### Port Operator
- Manage port chargers
- Set V2G pricing
- View booking requests
- Monitor port analytics
- Dashboard with system status

## 🔐 Authentication

The application uses token-based authentication:

1. User logs in with email/password
2. Backend returns JWT token
3. Token stored in localStorage
4. Token sent with each API request in Authorization header
5. Token used for user identification and permissions

## 📱 Responsive Design

- **Mobile**: 320px - 640px
- **Tablet**: 640px - 1024px
- **Desktop**: 1024px+

All pages are fully responsive and mobile-first.

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Semantic HTML
- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Color contrast compliance

## 🚀 Performance

- Optimized bundle size (~350KB gzipped)
- Code splitting with Vite
- Lazy loading for routes
- Image optimization
- CSS tree-shaking with Tailwind CSS 4

## 🐛 Troubleshooting

### Port already in use
```bash
# Use a different port
npm run dev -- --port 3001
```

### Dependencies not installing
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Run type checking
npm run check

# Fix TypeScript issues
npm run format
```

## 📚 Documentation

- `MIGRATION_CHANGELOG.md` – Migration details and changes
- `STYLING_TEMPLATES.md` – Component styling examples
- `IMPLEMENTATION_GUIDE.md` – Development guide

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review component examples in `STYLING_TEMPLATES.md`
3. Check the implementation guide
4. Review component source code

---

**Last Updated**: April 6, 2026
**Version**: 1.0.0
**Status**: Production Ready
