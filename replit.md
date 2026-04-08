# Tasty Crousty — Full-Stack Food Delivery Platform (Algeria)

## Overview

Premium food delivery SaaS for Algeria. French-first UI with Arabic RTL support (Cairo/Inter fonts). Four distinct user interfaces: Customer website, Restaurant dashboard, Driver dashboard (mobile-first), and Admin panel. Currency displayed as "DA" (Algerian Dinar) throughout all interfaces.

## Project Structure

```
artifacts/
  api-server/       Express API (port 8080)
    src/
      routes/       REST endpoints (auth, restaurants, menus, orders, dispatch, admin, notifications, ...)
      lib/          State machine, dispatch engine, auth, notifications, logger
      seed.ts       Comprehensive demo data seed (build → dist/seed.mjs)
  tasty-crousty/    React + Vite frontend
    src/
      pages/
        Home.tsx                  Landing page
        auth/                     Login, Register (split-panel design)
        customer/                 Restaurants, RestaurantDetail, Checkout, Orders, OrderTracking, AddressBook
        restaurant/               Restaurant Dashboard
        driver/                   Driver Dashboard (mobile-first)
        admin/                    Admin Dashboard + 11 sections
      components/
        ui/                       Shared UI components (NotificationBell, MissionCard, OrderTimeline, etc.)
        layout/                   Navbar, RoleSidebar
      lib/                        Auth context, type definitions
  mobile/           Expo React Native app (customer + driver)
    app/
      index.tsx                   Auth redirect gate
      (auth)/                     Login, Register screens
      (tabs)/                     index (home/missions), orders, account tabs
      restaurant/[id].tsx         Menu browsing + cart
      checkout.tsx                Order placement
      order/[id].tsx              Real-time order tracking with timeline
    context/                      AuthContext (JWT + AsyncStorage), CartContext
    utils/format.ts               formatDA(), formatDate(), getStatusLabel()
    constants/colors.ts           Amber brand tokens (light + dark)
  mockup-sandbox/   Design prototyping sandbox
lib/
  db/               Drizzle schema + PostgreSQL client
    src/schema/     Table definitions (12 schemas: users, cities, zones, restaurants, menus, orders, dispatch, profiles, ratings, notifications, fraud, payments)
  api-spec/         OpenAPI spec (source of truth for API client generation)
  api-client-react/ Orval-generated React Query hooks
  api-zod/          Zod validators from OpenAPI spec
```

## Roles & Dashboards

| Role       | Login URL           | Dashboard URL | Description |
|------------|---------------------|---------------|-------------|
| Customer   | /auth/login         | /restaurants  | Browse, order, track deliveries |
| Restaurant | /auth/login         | /dashboard    | Manage orders, PrepLock control |
| Driver     | /auth/login         | /driver       | Accept missions, confirm delivery |
| Admin      | /auth/login         | /admin        | Full platform oversight |

## Demo Accounts (Seed v4)

| Role       | Email                      | Password     | Notes |
|------------|---------------------------|--------------|-------|
| Admin      | admin@tastycrousty.dz     | admin123456  | Full admin access |
| Restaurant | restaurant@tc.dz           | resto123     | Owns 2 Algiers restaurants |
| Driver     | driver@tc.dz               | driver123    | Mohamed Meziane, 312 deliveries |
| Customer   | customer@tc.dz             | client123    | Yasmine Boumediene, 14 orders |

Additional accounts (same passwords): driver2@tc.dz → driver5@tc.dz, customer2@tc.dz → customer6@tc.dz, resto2@tc.dz, resto3@tc.dz

## Setup

```bash
# Install dependencies
pnpm install

# Push DB schema (first time)
pnpm --filter @workspace/db run push

# Build API server
pnpm --filter @workspace/api-server run build

# Seed demo data
pnpm --filter @workspace/api-server run seed

# Start all services (dev)
pnpm run dev
```

## Seed Usage

The seed script is idempotent — it checks a version key and skips if already at the current version.

```bash
# Build first, then seed
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run seed
```

To force a fresh reseed, change `SEED_VERSION` in `artifacts/api-server/src/seed.ts` to a new value (e.g. "v5"), rebuild and reseed.

Seed creates:
- 3 cities (Alger, Oran, Constantine), 8 zones
- 6 restaurants across categories (Méditerranéen, Fast Food, Pizza, Algérien, Grillades)
- 15 users (1 admin, 3 restaurant owners, 5 drivers, 6 customers)
- 32+ menu items with realistic Algerian prices (in DA)
- 17 orders across all 17 statuses
- 11 ratings, 12 notifications, 4 fraud flags, platform settings

## Critical Business Rule — PrepLock™

Restaurants CANNOT start preparing until BOTH:
1. A driver is assigned (dispatched and accepted)
2. The customer confirms the delivery details with the driver

Enforced server-side in `POST /api/orders/:id/start-preparing` (returns 400 unless status === `confirmed_for_preparation`). Visualized by the `PrepLockIndicator` component in the restaurant dashboard.

## Order State Machine (17 statuses)

```
draft
  → pending_dispatch           (order placed, looking for driver)
  → dispatching_driver         (driver notification sent)
  → driver_assigned            (driver accepted)
  → awaiting_customer_confirmation  (driver calls customer)
  → needs_update               (customer requests address correction)
  → confirmation_failed        (customer unreachable)
  → confirmed_for_preparation  ← PrepLock™ unlocks here
  → preparing                  (restaurant starts cooking)
  → ready_for_pickup           (food ready)
  → picked_up                  (driver collected)
  → on_the_way                 (en route)
  → arriving_soon              (< 5 min away)
  → delivered                  (QR scan confirmed)
  → cancelled / failed / refunded
```

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: v24
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui, wouter (routing)
- **Backend**: Express 5, TypeScript, esbuild
- **Database**: PostgreSQL, Drizzle ORM (`drizzle-orm` catalog version)
- **Validation**: Zod (`zod/v4`), drizzle-zod
- **API codegen**: Orval (OpenAPI → React Query hooks)
- **Auth**: JWT in localStorage (`tc_token`)
- **Fonts**: Inter (UI), Cairo (Arabic/RTL)

## Routes

| Path                  | Component            | Notes |
|-----------------------|----------------------|-------|
| /                     | Home                 | Gradient hero, PrepLock badge, category chips |
| /restaurants          | Restaurants          | Filter by category/search, approved only |
| /restaurants/:id      | RestaurantDetail     | Menu + cart, real-time stock |
| /checkout             | Checkout             | Zone selector, zone-based delivery fee, DA totals, validation |
| /orders               | Orders               | Live status, needs_update alert |
| /orders/:id           | OrderTracking        | 17-step timeline, QR delivery |
| /auth/login           | Login                | Also /connexion — demo quick-fill |
| /auth/register        | Register             | Also /inscription — role tabs |
| /dashboard            | RestaurantDashboard  | Also /restaurant |
| /driver               | DriverDashboard      | Also /livreur |
| /admin                | AdminDashboard       | 11 sections: Overview, Orders, Dispatch, Confirmation, Restaurants, Drivers, Customers, Zones, Payments, Fraud, Settings |
| /admin → Orders → click | AdminOrderDetail     | Full-page modal: 12 sections — timeline, dispatch, PrepLock™ confirmation, QR, articles, payment, customer, restaurant, driver, fraud/disputes, internal notes, audit trail |
| /admin → Dispatch       | DispatchSection      | Premium control tower: KPI bar, order tabs (En attente/Rounds actifs/Bloquées), driver response monitor, activity feed, zone pressure cards, hourly analytics chart, manual assignment modal |

## Important: API Client URL Configuration

The generated Orval client already includes `/api` prefix in every URL path.
`setBaseUrl` in `App.tsx` must be `null` (or `import.meta.env.VITE_API_URL ?? null`) to avoid double `/api/api/` prefix.
The Vite dev server proxies `/api` → `localhost:8080`.

## Key Commands

```bash
pnpm run typecheck                                         # TypeScript check across all packages
pnpm --filter @workspace/api-spec run codegen             # Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/db run push                      # Push DB schema changes (dev)
pnpm --filter @workspace/api-server run build             # Build API server + seed script
pnpm --filter @workspace/api-server run seed              # Seed demo data
```

## CSS Utilities (custom, defined in index.css)

```css
.chip / .chip-active / .chip-inactive   /* Filter chip buttons */
.card-hover                             /* Card with lift + shadow on hover */
.gradient-text                          /* Amber-to-orange gradient text */
.fade-in-up-N (1-4)                    /* Staggered entrance animations */
.scrollbar-none                         /* Hide scrollbar (cross-browser) */
.status-pulse                           /* Amber pulsing dot */
.glass                                  /* Frosted glass effect */
.tabular-nums                           /* Monospaced numbers */
```

## NotificationBell (named export)

```tsx
import { NotificationBell } from "@/components/ui/NotificationBell";
// Always named export — NOT default export
```

## Currency Formatting

All monetary values use the `formatDA()` utility from `src/lib/format.ts`:

```ts
import { formatDA } from "@/lib/format";
formatDA(1500)  // → "1 500 DA"  (French space as thousands separator, no decimals)
formatDA(250)   // → "250 DA"
```

Never use `.toFixed(2) + " DA"` — always use `formatDA()` for consistency.

## Zone-Based Delivery Fee

Delivery fees follow this priority chain (server-side in `POST /api/orders`):
1. Zone fee (`zones.delivery_fee`) — if customer selected a zone at checkout
2. Platform default (`platform_settings.default_delivery_fee`) — currently 200 DA
3. Fallback: 350 DA

**Admin**: Zones section lets admins set/edit fee per zone inline.
**Checkout**: City → Zone dropdowns show `Zone name — X DA`. Selecting a zone updates the order summary live.

## Missing Orval hooks (use direct fetch/useMutation)

The following are not in the generated client and use direct `fetch()`:
- `useDispatchOrder`
- `useRetryAllDispatch`
- `useOverrideDelivery`

Notification API: `GET /api/notifications` → `{notifications, unreadCount}`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`
