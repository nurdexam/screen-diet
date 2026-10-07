# ScreenDiet

## Neon and Vercel setup

Set these environment variables in the Vercel project settings for Development, Preview, and Production:

- `DATABASE_URL`: the Neon pooled PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: a private random secret with at least 32 characters.
- `BETTER_AUTH_URL`: the public origin of the deployment, for example `https://your-project.vercel.app` (no `/api` path).

For local development, keep the Neon variables in the ignored `.env.local` file and run `npm run dev`. The Vite development plugin forwards `/api/auth`, `/api/data`, `/api/children`, and `/api/sessions` to the same handlers used by Vercel.

## Database setup

Run [`db/neon-setup.sql`](db/neon-setup.sql) once in the Neon SQL Editor for the same database used by `DATABASE_URL`. It creates Better Auth's four core tables and the two ScreenDiet tables. The SQL is safe to run again because it uses `IF NOT EXISTS`.

The app supports parent email/password accounts. A parent can create and manage multiple child profiles without giving children separate logins. Each child has an independent age, daily limit, blocked keywords, and screen-time history. Passwords and parent sessions are managed by Better Auth.

After updating an existing database, run the complete [`db/neon-setup.sql`](db/neon-setup.sql) script again. It creates the child-profile table, moves the existing child settings and sessions into that profile, and is safe to rerun. The dashboard timer records sessions while it is running; a browser dashboard cannot detect time spent in other phone apps on its own.
