# Supabase + AWS Migration Guide

## Overview

This project is migrating from Railway (MySQL) to Supabase (Postgres) for the database and authentication layer. The Flask backend and Next.js frontend will be deployed on a single AWS EC2 instance via Docker Compose.

Key decisions:
- **Database**: MySQL → Supabase Postgres
- **Auth**: Custom Flask JWT → Supabase Auth (email/password)
- **Hosting**: Single AWS EC2 t2.micro instance (free tier) running Docker Compose
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

**Instance:** t2.micro (free tier — 750 hrs/month free for 12 months)

**Steps:**
1. Launch a t2.micro Ubuntu 22.04 instance
2. Open ports: 22 (SSH), 3000 (frontend), 8000 (backend)
3. SSH in and install Docker + Docker Compose
4. Clone the repo, add the `.env` files, run `docker compose up -d`

**To run only when needed:** Stop the instance from the AWS console when not in use. You only pay for hours the instance is running (~$0.03/hr on-demand, effectively $0 on free tier).

**Auto-restart after reboot:** Add `restart: unless-stopped` to both services in `docker-compose.yml`.
