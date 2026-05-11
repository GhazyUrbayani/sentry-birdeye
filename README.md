![Sentry dashboard demo](docs/hero.gif)

# SENTRY - Pre-Trade Intelligence Agent (Solana)

AI-powered pre-trade intelligence for Solana traders

Next.js 15 (App Router) + TypeScript + TailwindCSS + Supabase + Upstash Redis.

## Architecture diagram
```mermaid
graph TD
  UI[Dashboard] --> TOKENS[/api/tokens]
  TOKENS --> SCAN[/api/scan]
  SCAN --> BE[Birdeye API]
  SCAN --> REDIS[Upstash Redis]
```

## Birdeye endpoints used
- `/defi/v2/new_listing`
- `/defi/v2/trending`
- `/defi/v3/token_security`
- `/defi/v3/token/holder`

## Local setup
1) `git clone <repo_url> && cd sentry-birdeye`
2) `npm install`
3) `npm run dev`

## What you get
- **Edge-first** API routes (stateless + horizontally scalable)
- **Birdeye circuit breaker** + retry/backoff
- **Redis caching** with TTLs per endpoint
- **Rate limiting** (token bucket, fixed window, sliding window log, leaky bucket queue)
- **Dashboard** (RSC) + **SSE live feed** consumer

## Environment variables
- Copy `.env.example` -> `.env.local`

## Key endpoints
- `GET /api/health`
- `GET /api/scan` (Bearer `CRON_SECRET`)
- `GET /api/tokens` (public, token-bucket limited)
- `GET /api/tokens?stream=1` (SSE stream for RadarFeed)
- `POST /api/subscribe` (fixed-window limited)

## Cron
`vercel.json` schedules `/api/scan?trigger=cron` every 5 minutes.

## Note on Node version
Next.js 15 supports **Node LTS** (18/20/22). If your local machine is on Node 25, `next build` may fail.

