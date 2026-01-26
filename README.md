# PredictTracker - Prediction Market Inconsistency Tracker

A production-ready web application that tracks pricing inconsistencies across prediction markets (Polymarket, Kalshi, Manifold) and identifies arbitrage opportunities.

## Features

- **Cross-venue price tracking**: Monitor the same predictions across multiple venues
- **Automatic market matching**: Uses title similarity and semantic heuristics to group related markets
- **Inconsistency detection**:
  - Cross-venue price divergence (same outcome priced differently)
  - Internal sanity checks (outcomes not summing to ~100%)
  - Arbitrage opportunity detection
- **Opportunity scoring**: Ranks opportunities by spread, liquidity, and freshness
- **Clean web UI**: Filterable table of opportunities with detailed breakdowns
- **Admin interface**: Manual correction of market matches
- **Scheduled refresh**: Automatic data updates every 5 minutes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **Data Source**: apibricks.io API

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd prediction-market-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open http://localhost:3000

### Initial Data Load

Trigger the first data sync by clicking the "Refresh" button in the UI, or call the cron endpoint:

```bash
curl http://localhost:3000/api/cron
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite database path | Yes |
| `APIBRICKS_API_KEY` | API key from apibricks.io | No* |
| `CRON_SECRET` | Secret for securing cron endpoint | No** |
| `DEMO_MODE` | Use mock data instead of API | No |

\* Leave empty to use demo/mock data
\** Required in production

### Demo Mode

For development without an API key, set `DEMO_MODE=true` in your `.env` file. This uses realistic mock data representing various market scenarios.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/          # Scheduled refresh endpoint
│   │   ├── opportunities/ # Opportunities API
│   │   ├── groups/        # Market groups API
│   │   ├── status/        # Sync status API
│   │   └── admin/         # Admin endpoints
│   ├── opportunity/[id]/  # Opportunity detail page
│   ├── admin/             # Admin UI
│   └── page.tsx           # Main opportunities page
├── components/
│   ├── Header.tsx
│   ├── StatusBar.tsx
│   ├── Filters.tsx
│   └── OpportunitiesTable.tsx
├── lib/
│   ├── db.ts              # Prisma client
│   ├── apibricks.ts       # API client
│   ├── matching.ts        # Market matching algorithm
│   ├── opportunities.ts   # Inconsistency detection
│   └── sync.ts            # Data sync orchestration
└── generated/
    └── prisma/            # Prisma client types
```

## Database Schema

### Core Models

- **Venue**: Prediction market platforms (Polymarket, Kalshi, Manifold)
- **Market**: Individual markets from each venue
- **Outcome**: Price/probability data for each market option
- **MarketGroup**: Canonical grouping of matched markets
- **Opportunity**: Detected inconsistencies/opportunities
- **SyncLog**: Refresh history and statistics

## API Endpoints

### Public

- `GET /api/opportunities` - List opportunities with filtering
- `GET /api/groups` - List market groups
- `GET /api/status` - Sync status and statistics

### Admin

- `GET /api/admin/markets` - List markets for matching
- `POST /api/admin/markets` - Link/unlink/create groups
- `PATCH /api/groups` - Verify/update groups

### Cron

- `GET/POST /api/cron` - Trigger data refresh (secured with `CRON_SECRET`)

## Production Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

Configure cron jobs in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Self-hosted

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Set up a cron job (e.g., with crontab):
```bash
*/5 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron
```

### Database in Production

For production, consider migrating to PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
}
```

2. Update `DATABASE_URL` in your environment

3. Run migrations:
```bash
npx prisma migrate deploy
```

## Matching Algorithm

The market matching algorithm uses several signals:

1. **Title similarity** (50% weight): Normalized string comparison
2. **Entity extraction** (20% weight): Dates, amounts, key terms
3. **Category matching** (10% weight): Related category detection
4. **Date proximity** (10% weight): Similar end dates
5. **Outcome compatibility** (10% weight): Matching outcome structures

Markets are grouped using union-find when their match score exceeds the threshold.

## Opportunity Detection

### Types

1. **Cross-venue divergence**: Same outcome priced >3% differently
2. **Internal sanity**: Outcome probabilities don't sum to ~100%
3. **Arbitrage**: Buying YES on venue A + NO on venue B < 100%

### Scoring

- **Spread score**: Higher spreads = higher scores
- **Liquidity score**: Log-scaled liquidity bonus
- **Venue count**: More venues = higher confidence
- **Freshness decay**: Scores decay over time

## License

MIT
