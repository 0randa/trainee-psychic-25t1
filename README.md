# 25t1-training-project: PSYCHIC

Repo for Psychic (Group 5)'s Team Project!

Our team made a minigame platform, where users can log in, play singleplayer minigames, and compete against other players' records with the leaderboards.

### Setup

1. Install Docker.
2. Create a Supabase project (see [docs/supabase-aws-migration.md](docs/supabase-aws-migration.md) for the schema and the keys to grab).
3. Get the env files from one of our teammates (or create them following the migration guide), and place them in their folders:
    - `backend/.env` — `DATABASE_URL`, `SUPABASE_URL`, `FRONTEND_URL`
    - `frontend/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
4. Run `docker compose up --build` to compile.
5. To run this again after compiling, run `docker compose up`, without the `--build`.

### Tech Stack

- Backend: Flask
    - Libraries: `flask-cors`, `flask-bcrypt`, `python-dotenv`, `psycopg2-binary`, `python-jose[cryptography]`, `requests`
- Frontend: Next.js
    - Libraries: `axios`, `@supabase/supabase-js`
- Database: Supabase (Postgres)
- Auth: Supabase Auth (email/password)
- Hosting: AWS EC2 (single instance, run via Docker Compose)

### Auth & Database

User accounts and sessions are handled by **Supabase Auth** (email/password). The Flask backend no longer issues its own tokens — it verifies Supabase-issued JWTs via the JWKS endpoint. Profile names live in a Supabase `profiles` table, while games and scores live in Supabase Postgres.

> This project previously used custom Flask JWT auth with a MySQL database hosted on Railway. For the full migration details, see [docs/supabase-aws-migration.md](docs/supabase-aws-migration.md) and [docs/jwt-migration-steps.md](docs/jwt-migration-steps.md).
