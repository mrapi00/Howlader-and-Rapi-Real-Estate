# Howlader Estate — Rent Tracker

A full-stack property management app built for small landlords to track tenants, collect rent, manage documents, and monitor property valuations — all from a mobile-friendly PWA.

## Features

- **Property & Unit Management** — Add properties with multiple apartment units, track occupancy rates
- **Tenant Tracking** — Manage tenant records, lease dates, and contact info
- **Payment Ledger** — Monthly rent tracking with due dates, paid/outstanding status, and payment history
- **Zelle Payment Submissions** — Tenants can submit payment confirmations for landlord approval (Pending → Confirmed/Rejected)
- **Tenant Portal** — Tenants access their own payment history and documents via building/unit/DOB lookup (no password needed)
- **Document Management** — Upload lease agreements and documents per tenancy, with private/tenant-visible flags
- **Property Valuations** — Automated weekly property value estimates via RentCast API, displayed on dashboard and per-property cards
- **PWA** — Installable on iOS/Android with offline support and service worker caching

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon) in production, SQLite locally |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 (credentials provider) |
| Styling | Tailwind CSS 3 |
| File Storage | Vercel Blob (production), local filesystem (dev) |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs (daily property valuations) |
| Icons | Lucide React |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/                      # Landlord login
│   ├── tenant-portal/              # Tenant self-service portal
│   ├── dashboard/
│   │   ├── page.tsx                # Dashboard overview (stats, portfolio value)
│   │   ├── properties/             # Property list + detail pages
│   │   ├── tenants/                # Tenant list + detail pages
│   │   └── payments/               # Payment tracking
│   └── api/
│       ├── auth/                   # NextAuth endpoints
│       ├── properties/             # Property CRUD
│       ├── tenants/                # Tenant CRUD
│       ├── tenancies/              # Apartment-tenant relationships
│       ├── payments/               # Payment records
│       ├── payment-submissions/    # Zelle submission workflow
│       ├── documents/              # File upload/download
│       ├── valuation/              # Portfolio value aggregation
│       └── cron/daily/             # Scheduled valuation job
├── components/                     # Shared components (providers, PWA install prompt)
└── lib/                            # Prisma client, auth config, utilities
prisma/
├── schema.prisma                   # Database schema (PostgreSQL)
└── seed.ts                         # Seed data for local development
```

## Local Development

The project uses SQLite locally (the production schema targets PostgreSQL). A helper script handles the swap automatically:

```bash
./scripts/dev-local.sh
```

This script:
1. Swaps the Prisma schema from PostgreSQL to SQLite
2. Generates the Prisma client
3. Creates and syncs the local SQLite database (`dev.db`)
4. Seeds the database on first run
5. Starts the Next.js dev server at `http://localhost:3000`
6. Restores the schema back to PostgreSQL on exit (Ctrl+C)

> The schema checked into git is always PostgreSQL. Never commit a SQLite schema.

### Prerequisites

- Node.js 20+ (via nvm)
- npm

### Environment Variables

Create a `.env.local` file (the dev script sets defaults, but you can override):

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret"
NEXTAUTH_URL="http://localhost:3000"
```

For production, also set:

```env
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_SECRET=        # Random secret for session signing
BLOB_READ_WRITE_TOKEN=  # Vercel Blob token for file uploads
CRON_SECRET=            # Bearer token for cron job auth
RENTCAST_API_KEY=       # RentCast API key for property valuations
```

## Production Deployment (Vercel)

The app auto-deploys from the `main` branch on Vercel.

**Build command** (configured in `package.json`):
```bash
prisma generate && next build
```

**Cron job** (configured in `vercel.json`):
- `/api/cron/daily` runs once daily at 10:00 AM UTC
- Fetches property value estimates from RentCast (throttled to once per 7 days per property)

## Database Schema

Core models and relationships:

```
User (landlord login)
Property → Apartment → Tenancy → Payment
                                → PaymentSubmission
                                → Document
         → PropertyValuation
Tenant ←→ Tenancy
```

Run `npx prisma studio` (or `npm run db:studio`) to browse the database visually.

## License

Private project — not licensed for redistribution.
