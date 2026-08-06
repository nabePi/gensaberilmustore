# Gensa Berilmu Store App

Next.js 15 App Router + TypeScript project for Gensa Berilmu Store.

## Requirements

- Node.js >= 20.x
- pnpm 11.x

## Local Development

1. Copy the environment file and adjust it if your local Postgres uses different credentials:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies and start the dev server:

   ```bash
   pnpm install
   pnpm dev
   ```

   The default `.env.example` points to a local PostgreSQL database: `genstore` on `localhost:5432` with user `postgres` / password `postgres`.

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

All runtime secrets and configuration are validated via `src/env.ts` (using Zod) before the app boots. Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

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
- `STORAGE_PROVIDER` (`s3` or `local`), `S3_ENDPOINT`, `S3_BUCKET`, `S3_KEY`, `S3_SECRET`
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
