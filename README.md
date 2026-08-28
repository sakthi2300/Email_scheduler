# ReachInbox Email Scheduler

A **production-grade email scheduler service + dashboard** — accepts email send requests via API, schedules them using **BullMQ + Redis** (no cron), sends via **Ethereal Email** (fake SMTP), survives server restarts, and exposes a React dashboard.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React + TypeScript                       │
│   React Router + AuthGuard · RTK Query · Redux Toolkit       │
│   Tailwind CSS v4                                            │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS + JWT (HttpOnly cookie)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express + TypeScript (API layer)            │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
  Google OAuth          MySQL         Elasticsearch
                   (source of truth)   (search index)
                          │
                          ▼
                  BullMQ + Redis
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      scheduled-email             retry-email
        Main Worker                Retry Worker
       concurrency=5              concurrency=2
              │                       │
              └───────────┬───────────┘
                          ▼
                 emailProcessor()
              (Sequential Pipeline)
```

### Email Processing Pipeline (Sequential — Not Parallel)

1. **Idempotency Check** (MySQL) — If `status === 'sent'`, skip entirely
2. **Rate Limit Check** (Redis INCR) — On hit: delay to next hour + Slack notification
3. **Inter-Email Delay Gate** (Redis timestamp) — Enforces minimum gap between sends
4. **Send via Ethereal SMTP** — On success: mark sent + ES index; On failure: rethrow for retry routing

### Two Queues, Two Workers, One Processor

| Queue | Populated By | Worker | Concurrency |
|-------|-------------|--------|-------------|
| `scheduled-email` | API fan-out | Main Worker | 5 |
| `retry-email` | Main Worker's `failed` handler | Retry Worker | 2 |

Both workers call `emailProcessor()` — the send logic is never duplicated.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS v4 |
| State Management | Redux Toolkit (auth), RTK Query (server state) |
| Backend | Express, TypeScript |
| Queue | BullMQ + Redis |
| Database | MySQL + Prisma ORM |
| Search | Elasticsearch 8 |
| Auth | Google OAuth 2.0, JWT (HttpOnly cookie) |
| Notifications | Slack OAuth (incoming webhook) |
| Email | Ethereal Email (fake SMTP) |
| Admin | Bull-Board at `/admin/queues` |

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **Docker** + Docker Compose
- **Google OAuth credentials** (Google Cloud Console)
- **Slack App** with OAuth configured (optional for notifications)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts MySQL, Redis, and Elasticsearch.

### 2. Backend Setup

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Google OAuth credentials, etc.

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate --schema=src/prisma/schema.prisma

# Run database migration
npx prisma db push --schema=src/prisma/schema.prisma

# Seed test data (creates a test user + Ethereal sender)
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

### 4. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Bull-Board**: http://localhost:4000/admin/queues
- **Ethereal Email**: https://ethereal.email (view sent emails)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `DATABASE_URL` | — | MySQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch URL |
| `JWT_SECRET` | — | Secret for JWT signing |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `SLACK_CLIENT_ID` | — | Slack app client ID |
| `SLACK_CLIENT_SECRET` | — | Slack app client secret |
| `MAX_EMAILS_PER_HOUR` | `200` | Global hourly rate limit |
| `EMAIL_DELAY_MS` | `2000` | Minimum gap between sends (ms) |
| `MAX_ATTEMPTS` | `3` | Max retry attempts per email |

---

## Rate Limiting

- **Mechanism**: Redis atomic `INCR` + `EXPIRE`, keyed `ratelimit:{senderId}:{hourWindow}`
- **Default**: 200 emails/hour/sender (configurable per sender or via env)
- **On limit hit**: Job is delayed to the next hour window (never dropped, never permanently failed)
- **Slack notification**: Fires a real webhook message when the limit is hit (skips silently if Slack isn't connected)

## Inter-Email Delay

- **Mechanism**: Redis `SET` with `PX` TTL, keyed `last-sent:{senderId}`
- **Default**: 2000ms between sends from the same sender
- **Why not static delay?**: A per-job delay computed at fan-out doesn't hold under concurrency — this Redis gate dynamically enforces the gap regardless of how many workers run

---

## Persistence & Restart Safety

- **BullMQ jobs are stored in Redis** — they survive server restarts
- **Workers re-attach** to existing queues on boot — no re-enqueue from scratch
- **Idempotency check** in step 1 of the processor prevents duplicate sends
- **Deterministic jobId** (`SHA-256(batchId:recipientEmail)`) provides queue-level dedup

### Manual Restart Test

1. Schedule emails 2+ minutes in the future
2. Kill the server process (`Ctrl+C`)
3. Restart the server (`npm run dev`)
4. Confirm emails still send at the correct time and are not duplicated

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/google` | Redirect to Google consent screen |
| GET | `/api/auth/google/callback` | OAuth callback, issues JWT cookie |
| POST | `/api/auth/logout` | Clear JWT cookie |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/emails/schedule` | Fan-out batch scheduling |
| GET | `/api/emails/scheduled` | Paginated scheduled emails |
| GET | `/api/emails/sent` | Paginated sent/failed emails |
| GET | `/api/emails/search?q=` | Elasticsearch search |
| GET | `/api/emails/:id` | Single email with attempts |
| DELETE | `/api/emails/:id` | Delete email + cancel BullMQ job |
| POST | `/api/senders` | Create Ethereal sender |
| GET | `/api/senders` | List senders |
| POST | `/api/leads/upload` | Upload CSV/TXT leads |
| GET | `/api/slack/oauth/authorize` | Slack OAuth redirect |
| GET | `/api/slack/oauth/callback` | Slack OAuth callback |
| DELETE | `/api/slack/disconnect` | Remove Slack integration |
| GET | `/api/slack/status` | Check Slack connection |
| GET | `/admin/queues` | Bull-Board admin UI |

---

## Assumptions & Trade-offs

1. **Ethereal Email** is used instead of real SMTP — emails can be viewed at https://ethereal.email
2. **SMTP password** is stored in plaintext in the DB for development — production would use encryption at rest
3. **Elasticsearch** is best-effort — if ES is down, emails still send, search just won't work
4. **Slack notifications** are fire-and-forget — they never block or fail the send pipeline
5. **No horizontal scaling** considered — single-instance Redis is the coordination point
6. **Rate limit** uses sender's `hourlyLimit` from the Sender record, overridable per batch
