# Brass & Blade - Barber Shop Booking

A responsive website for a barber shop where customers see real open times, request a booking, and track its status, while barbers confirm or decline requests from a dashboard.

## Features

- **Landing page**: services and prices, barbers, opening hours, location, and a live "next open chair" card.
- **Booking flow** (`/book`): pick a service, a barber (or "Any barber"), a day on the calendar, and an open time, then enter contact details and review. Fully booked and closed days are greyed out.
- **Booking status page** (`/booking/<code>`): shows Pending / Confirmed / Declined / Cancelled, refreshes automatically while pending, and lets the customer cancel.
- **Barber dashboard** (`/admin`): password-protected. Requests, Today, and Upcoming tabs; confirm or decline with an optional message; filter by barber; refreshes every 15 seconds and pops a toast when new requests arrive.
- **Zalo, phone and walk-in bookings** (`/admin/bookings/new`): when a customer books by messaging on Zalo, the barber adds it from the dashboard ("From Zalo" button). Paste the Zalo message to auto-fill the phone number, choose a real open time, and save it as confirmed or pending. The slot is blocked on the website right away, and you get a ready-to-send message (Vietnamese or English) with the booking link, a Copy button and an "Open Zalo chat" deep link (`zalo.me/<phone>`). Every dashboard card also has a "Message" button to resend it.
- **No double booking**: pending and confirmed bookings both hold their slot, and every booking is re-checked inside a database transaction before it is saved.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide icons, Sonner toasts |
| Data | Prisma ORM with SQLite (swap to Postgres for production) |
| Forms & validation | React Hook Form + Zod (shared by client and server) |
| Dates | date-fns + @date-fns/tz (all slot math runs in the shop's time zone) |
| Auth | Signed JWT cookie via `jose`, checked in middleware |

## Getting started

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
cp .env.example .env
pnpm db:setup     # creates the SQLite database and seeds barbers, services and sample bookings
pnpm dev          # http://localhost:3457
```

Barber dashboard: http://localhost:3457/admin (default password `barber123`, set `ADMIN_PASSWORD` in `.env` to change it).

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server on port 3457 |
| `pnpm build && pnpm start` | Production build and server |
| `pnpm db:reset` | Wipe the database and re-seed |
| `pnpm lint` | Run ESLint |

## Customizing

- **Shop name, address, phone, opening hours, time zone, booking rules**: [`src/config/shop.ts`](src/config/shop.ts)
- **Barbers, services, and each barber's working hours**: [`prisma/seed.ts`](prisma/seed.ts), then run `pnpm db:reset`
- **Colors and fonts**: [`src/app/globals.css`](src/app/globals.css) and [`src/app/layout.tsx`](src/app/layout.tsx)

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma connection string |
| `ADMIN_PASSWORD` | `barber123` | Password for `/admin` |
| `SESSION_SECRET` | dev fallback | Secret used to sign the dashboard cookie. Set a long random value in production. |

## Notifications

Booking events (requested, confirmed, declined, cancelled) go through [`src/lib/notify.ts`](src/lib/notify.ts). They are logged to the server console for now; replace the function body with Resend (email) or Twilio (SMS) to notify customers and barbers for real.

## Zalo workflow

1. A customer messages the shop on Zalo asking for a time.
2. In `/admin`, tap **From Zalo**. Paste their message (the phone number is extracted and the message is kept as a note), enter their name, and pick the service, barber and an open time. Staff can book times inside the 30-minute online lead time.
3. Save as **Confirmed** (already agreed in chat) or **Pending** (hold the slot while you check).
4. Copy the generated message and send it back in Zalo, or tap **Open Zalo chat**. The link lets the customer view or cancel the booking on the website.

Bookings are tagged with their source (`WEBSITE`, `ZALO`, `PHONE`, `WALK_IN`) and show a "via Zalo" badge on the dashboard. A fully automatic Zalo integration (reading messages through the Zalo Official Account API) would need an approved OA and API credentials; this workflow works today with no setup.

## Deploying

1. Change `provider = "sqlite"` to `"postgresql"` in [`prisma/schema.prisma`](prisma/schema.prisma) and point `DATABASE_URL` at a hosted Postgres (Neon, Supabase, etc.).
2. Set `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Run `pnpm prisma db push && pnpm db:seed` once, then deploy (Vercel works out of the box).

## Project structure

```
prisma/                   schema + seed data
src/app/                  pages, API routes and server actions
  api/availability/       open slots for a day, open-day counts for the calendar
  book/                   booking wizard + createBooking/cancelBooking actions
  booking/[code]/         customer booking status page
  admin/                  barber login, dashboard and confirm/decline actions
src/components/booking/   wizard steps and availability hooks
src/components/admin/     dashboard booking cards
src/lib/availability.ts   slot engine (working hours minus active bookings)
src/lib/time.ts           shop time zone helpers and formatting
```
