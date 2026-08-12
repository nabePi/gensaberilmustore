# Gensa Berilmu Store App

[![CI](https://github.com/nabePi/gensaberilmustore/actions/workflows/ci.yml/badge.svg)](https://github.com/nabePi/gensaberilmustore/actions/workflows/ci.yml)

Next.js 15 App Router + TypeScript project for Gensa Berilmu Store.

## Documentation

Complete project documentation lives in [`docs/`](./docs/). Start with [`docs/README.md`](./docs/README.md) for an overview, architecture, role/permission matrix, page catalog, business flows, database reference, and API reference.

## Requirements

- Node.js >= 20.x
- pnpm 11.x

## Local Development

Follow these steps to get the app running on your machine from a fresh clone.

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start a PostgreSQL database.** You need a running Postgres instance reachable from your machine. If you don't already have one, the quickest way is Docker:

   ```bash
   docker run --name genstore-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=genstore -p 5432:5432 -d postgres:16
   ```

   (Or use a native Postgres install / an existing remote dev database — any `postgresql://` connection string works.)

3. **Copy the environment file and fill in the required values:**

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — defaults to `postgresql://postgres:postgres@localhost:5432/genstore`, matching the Docker command above. Change it if your database uses different credentials/host/port.
   - `NEXTAUTH_SECRET` and `JWT_SECRET` — must each be at least 32 characters. Generate random values with:
     ```bash
     openssl rand -base64 32
     ```
   - Everything else in `.env.example` (Midtrans, Fonnte, Resend, R2, Sentry, etc.) is optional for local development — leave those commented out unless you're testing that specific integration. Image uploads fall back to local disk storage (`public/uploads/`) when `STORAGE_PROVIDER` is unset.

4. **Verify your environment is valid** (optional but recommended):

   ```bash
   pnpm env:check
   ```

5. **Apply database migrations and generate the Prisma Client:**

   ```bash
   pnpm db:migrate:dev
   ```

6. **Seed the database** with an admin account, categories, sample products, cities, and vouchers:

   ```bash
   pnpm db:seed
   ```

   This creates an admin login you can use at `/admin/login`: **`admin@gensaberilmu.co.id`** / **`admin123`**.

7. **Start the dev server:**

   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser (admin panel at [http://localhost:3000/admin](http://localhost:3000/admin)).

## Environment Variables

All runtime secrets and configuration are validated via `src/env.ts` (using Zod) before the app boots.

### Required variables

| Variable                           | Description               | Validation                             |
| ---------------------------------- | ------------------------- | -------------------------------------- |
| `NODE_ENV`                         | Runtime environment       | `development`, `test`, or `production` |
| `DATABASE_URL`                     | PostgreSQL connection URL | Must start with `postgresql://`        |
| `NEXTAUTH_SECRET` or `AUTH_SECRET` | Auth session secret       | Min 32 characters                      |
| `JWT_SECRET`                       | Custom JWT secret         | Min 32 characters                      |

You can use either `NEXTAUTH_SECRET` or `AUTH_SECRET` for the auth secret.

### Placeholder variables

The following variables are declared in the validator but are optional until the related feature is implemented:

- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_ENV` (`sandbox` or `production`)
- `FONNTE_TOKEN`
- `RESEND_API_KEY`
- `STORAGE_PROVIDER` (`r2` or `local`, default `local`); when `r2`, also set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (Cloudflare R2, S3-compatible)
- `SENTRY_DSN`

To validate your environment without starting the dev server, run:

```bash
pnpm env:check
```

If any required variable is missing or invalid, the command will print a clear error message and exit with a non-zero status code.

## Scripts

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `pnpm dev`            | Start the development server             |
| `pnpm build`          | Build for production                     |
| `pnpm start`          | Start the production server              |
| `pnpm lint`           | Run ESLint                               |
| `pnpm typecheck`      | Run TypeScript type check                |
| `pnpm format`         | Run Prettier                             |
| `pnpm env:check`      | Validate environment variables           |
| `pnpm test`           | Run tests                                |
| `pnpm db:generate`    | Generate Prisma database client          |
| `pnpm db:migrate`     | Run Prisma migration deploy              |
| `pnpm db:migrate:dev` | Create and run migrations in development |
| `pnpm db:studio`      | Open Prisma Studio                       |
| `pnpm db:seed`        | Seed the database                        |

## Code Quality & Git Hooks

This repo uses ESLint, Prettier, Husky, lint-staged, and commitlint to keep the codebase consistent.

- Hooks are installed automatically on `pnpm install` via the `prepare` script.
- **`pre-commit`**: runs `lint-staged` (`eslint --fix` + `prettier --write` on staged files) and `pnpm typecheck`. Commits fail if lint errors or type errors remain.
- **`commit-msg`**: enforces [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat: add cart page`, `fix(auth): handle expired token`.

Run `pnpm format` to format the whole repo, and `pnpm lint` to check everything manually.

**Do not bypass the hooks.** Using `--no-verify` (or `HUSKY=0`) is forbidden for contributors — every commit must be validated. If a hook fails, fix the underlying issue instead of skipping it.

## Database

This project uses [Prisma](https://www.prisma.io/) with PostgreSQL.

- Edit `prisma/schema.prisma` to change the data model.
- Run `pnpm db:generate` to regenerate the Prisma Client after any schema change.
- Run `pnpm db:migrate:dev` to create and apply migrations during local development.
- Run `pnpm db:studio` to explore the database with Prisma Studio.

Make sure `DATABASE_URL` is set in `.env` before running migrations or Studio.

### Seeding

Seed the database with an admin account, initial categories, 20 sample products, cities, and vouchers:

```bash
pnpm db:seed
```

The seed script (`prisma/seed.ts`) is idempotent, so it can be run multiple times without creating duplicate data.

## Project Structure

```
src/
  app/        # Next.js App Router routes
  components/ # React components
  lib/        # Shared client-side utilities
  server/     # Server-only code
  db/         # Database schema and queries
  types/      # Shared TypeScript types
public/       # Static assets
```
