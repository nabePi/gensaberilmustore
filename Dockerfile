# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# ---- deps: install all dependencies (incl. devDependencies for build) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: generate Prisma client and build the Next.js app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholder values so env validation (imported by next.config.ts) passes
# at build time. Real values are injected at runtime via environment vars.
ARG DATABASE_URL=postgresql://user:password@localhost:5432/db
ARG JWT_SECRET=build-time-placeholder-secret-please-override-32
ARG AUTH_SECRET=build-time-placeholder-secret-please-override-32
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# they must be passed as build args (see docker-compose.yml build.args).
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
ARG NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
ENV DATABASE_URL=$DATABASE_URL \
  JWT_SECRET=$JWT_SECRET \
  AUTH_SECRET=$AUTH_SECRET \
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY \
  NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=$NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION \
  NEXT_TELEMETRY_DISABLED=1

RUN pnpm db:generate
RUN pnpm build

# ---- runner: minimal production image ----
FROM base AS runner
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
