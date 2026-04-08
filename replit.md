# Tasty Crousty — Full-Stack Food Delivery Platform

## Overview

Premium food delivery SaaS for Algeria. French-first UI with Arabic RTL support. Four distinct user interfaces: Customer website, Restaurant dashboard, Driver dashboard (mobile-first), and Admin panel.

## Critical Business Rule

Restaurants CANNOT start preparing until a driver is assigned AND the customer confirms the order. Enforced server-side in `/api/orders/:id/start-preparing` (returns 400 unless status === `confirmed_for_preparation`) and visually via `PrepLockIndicator` component.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + wouter (routing)
- **API framework**: Express 5 (port 8080)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Build**: esbuild (API server bundle)

## Architecture

```
artifacts/
  api-server/      — Express API (port 8080)
  tasty-crousty/   — React frontend (Vite, proxies /api → localhost:8080)
  mockup-sandbox/  — Design sandbox (port 8081)
lib/
  db/              — Drizzle schema + migrations + PostgreSQL client
  api-spec/        — OpenAPI spec (source of truth for API)
  api-client-react/ — Orval-generated React Query hooks (NO /api prefix in setBaseUrl!)
  api-zod/         — Zod validators from OpenAPI spec
```

## Important: API Client URL Configuration

The generated API client (Orval) already includes `/api` in every URL path (e.g., `/api/restaurants`). The Vite proxy routes `/api` → `localhost:8080`. Therefore `setBaseUrl` MUST be set to `null` (not `/api`) in App.tsx to avoid double `/api/api/` paths.

## Order State Machine (17 statuses)

`draft` → `pending_dispatch` → `dispatching_driver` → `driver_assigned` → `awaiting_customer_confirmation` → [`confirmed_for_preparation` | `needs_update` | `confirmation_failed`] → `preparing` → `ready_for_pickup` → `picked_up` → `on_the_way` → `arriving_soon` → `delivered` (+ `cancelled` / `failed` / `refunded`)

## Demo Accounts (Seeded)

| Role       | Email                      | Password     |
|------------|---------------------------|--------------|
| Admin      | admin@tastycrousty.dz     | admin123456  |
| Restaurant | restaurant@tc.dz           | resto123     |
| Driver     | driver@tc.dz               | driver123    |
| Customer   | customer@tc.dz             | client123    |

## Routes

| Path            | Component            | Notes |
|-----------------|----------------------|-------|
| /               | Home                 | French hero page |
| /restaurants    | Restaurants          | List with search |
| /restaurants/:id | RestaurantDetail    | Menu + add to cart |
| /auth/login     | Login                | Also /connexion alias |
| /auth/register  | Register             | Also /inscription alias |
| /checkout       | Checkout             | Cart → order placement |
| /orders         | Orders               | Customer order history |
| /orders/:id     | OrderTracking        | Real-time order tracking + QR |
| /admin          | AdminDashboard       | Admin role required |
| /dashboard      | RestaurantDashboard  | Restaurant role required (also /restaurant) |
| /driver         | DriverDashboard      | Driver role required (also /livreur) |

## Auth

JWT stored in localStorage as `tc_token`. User object stored as `tc_token` (JSON). Token getter registered with `setAuthTokenGetter`. Role-based redirect after login.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `node --import tsx/esm artifacts/api-server/src/seed.ts` — seed demo data (use seed.mjs instead)
- To seed DB: `NODE_PATH=/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules node artifacts/api-server/src/seed.mjs`

## Seeding the Database

Use `artifacts/api-server/src/seed.mjs` with explicit NODE_PATH pointing to the pg module:
```
NODE_PATH=/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules node artifacts/api-server/src/seed.mjs
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
