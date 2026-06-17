# Supabase + AWS Migration Guide

## Overview

This project is migrating from Railway (MySQL) to Supabase (Postgres) for the database and authentication layer. The Flask backend and Next.js frontend will be deployed on a single AWS EC2 instance via Docker Compose.

Key decisions:
- **Database**: MySQL → Supabase Postgres
- **Auth**: Custom Flask JWT → Supabase Auth (email/password)
- **Hosting**: Single AWS EC2 t2.micro instance running Docker Compose (free-tier eligibility depends on the account's signup date — see the cost notes below)
- **Data model**: `age` removed from the user model; `Users` table replaced by Supabase `auth.users` + a `profiles` table holding `name`

---

## Supabase Setup

**1. Create a Supabase project** at [supabase.com](https://supabase.com).

**2. Run the following SQL in the Supabase SQL editor:**

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  name varchar(255) not null
);

create table "Games" (
  id serial primary key,
  name varchar(255) not null
);

create table "Scores" (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  game_id int references "Games"(id) not null,
  score int not null,
  created_at timestamp default now()
);
```

**3. Grab these values from Supabase → Project Settings → API:**
- Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
- Anon public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

> Note: Do NOT use the legacy JWT secret for token verification — Supabase has migrated to asymmetric signing keys. The backend verifies tokens via the JWKS endpoint instead.

**4. Grab the database connection string from Supabase → Project Settings → Database:**
- Connection string (`DATABASE_URL`) — use the "URI" format

---

## Backend Environment Variables

Create `backend/.env`:

```
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
FRONTEND_URL=http://localhost:3000
```

---

## Frontend Environment Variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## What Changes in the Code

### Backend
- `auth.py` is deleted — Supabase handles all auth
- `scores.py` switches from MySQL to Postgres, and verifies Supabase JWTs instead of issuing its own
- `requirements.txt` swaps `mysql-connector-python` + `flask-jwt-extended` for `psycopg2-binary`, `python-jose[cryptography]`, and `requests`
- `app.py` becomes a minimal Flask app (no more JWT config)

### Frontend
- `@supabase/supabase-js` is installed
- Login/register/logout pages call Supabase directly instead of the Flask backend
- A shared `api.js` helper centralises all Flask API calls and attaches the Supabase JWT automatically
- The hardcoded `http://localhost:8000` URL is replaced with an environment variable everywhere

---

## AWS EC2 Deployment

**Instance:** t2.micro, Ubuntu 22.04.

**Steps:**
1. Launch a t2.micro Ubuntu 22.04 instance
2. Open ports: 22 (SSH), 80/443 (reverse proxy — see TLS below), and 3000/8000 only if you skip the proxy
3. SSH in and install Docker + Docker Compose
4. Clone the repo, add the `.env` files, run `docker compose up -d`

**Auto-restart after reboot:** Add `restart: unless-stopped` to both services in `docker-compose.yml`.

### Cost — read before assuming "free"

The earlier "effectively $0, just stop the instance when idle" plan does not hold. Confirm the real numbers before relying on them:

- **Free-tier eligibility depends on the account's signup date.** The legacy 12-month Free Tier (750 t2.micro hrs/month) was retired for accounts created on or after **15 July 2025**; newer accounts get a time-limited credit model instead. If this account is post-July-2025, there is no free t2.micro.
- **Public IPv4 is billed even when the instance is stopped.** Since **1 Feb 2024**, AWS charges **$0.005/hr (~$3.65/month) per public IPv4 address**, attached or idle. So keeping an Elastic IP across restarts still bills while stopped; *not* keeping one means the IP changes on every restart (which breaks the frontend — see below).
- **A stopped instance still bills for its EBS root volume** (~$0.50–0.80/month for an 8 GB gp3 volume).
- A continuously-running micro instance is roughly **$8–10/month** plus IPv4 + EBS. Verify exact `ap-southeast-2` figures in the AWS Pricing Calculator.

Net: stopping the box when idle saves the compute hours but **not** IPv4 + EBS, and it's incompatible with the leaderboard's "other players can reach it" expectation. Budget for a small always-on monthly cost rather than $0.

### Stable address (required for the frontend to work)

`NEXT_PUBLIC_API_URL` is a **build-time** value — Next.js compiles it into the static bundle at `next build`. If the backend's public IP changes (the no-Elastic-IP case), the frontend points at a dead address until it is rebuilt and redeployed. Therefore:

- Allocate an **Elastic IP** (or a domain pointing at one) so the backend address is stable across restarts.
- Set the production `NEXT_PUBLIC_API_URL` to that stable address (not `localhost`) **before building** the frontend image, and set `FRONTEND_URL` on the backend to the stable frontend origin for CORS.

### Production servers (not the dev servers in the current Dockerfiles)

The current Dockerfiles run development servers, which are not suitable for real traffic:

- `frontend/Dockerfile` runs `npm run dev` → should run a production build (`next build` then `next start`, or a static export served by the reverse proxy). **Caveat:** `next build` runs ESLint and currently fails on pre-existing codebase-wide `react/prop-types` errors. Either clear those errors or set `eslint.ignoreDuringBuilds` in `next.config` before the production build will succeed.
- `backend/Dockerfile` runs `python app.py` (Flask's built-in dev server — single-threaded, explicitly not for production) → should run a WSGI server, e.g. `gunicorn` (add `gunicorn` to `requirements.txt` and run `gunicorn app:app --bind 0.0.0.0:8000`).

### TLS and SSH hardening

- The app sends **Supabase JWTs in the `Authorization` header**. Serving over plain HTTP (ports 3000/8000) exposes those tokens in transit. Put **nginx or Caddy** in front as a reverse proxy terminating **HTTPS** (Caddy auto-provisions a Let's Encrypt cert), and route `:80/:443` → the frontend/backend containers instead of exposing 3000/8000 publicly.
- Restrict port **22** to a known IP, or use **SSM Session Manager** instead of opening SSH to `0.0.0.0/0`.

> A decoupled S3 + CloudFront (static frontend) + Lambda (Flask) + Supabase topology would fit this app's shape (static SPA + thin stateless API) and reach genuine $0-idle with free TLS, at the cost of a larger setup change. It was considered and deferred in favour of keeping the single-instance setup simple for this project; revisit it if always-on cost or availability becomes a concern.
