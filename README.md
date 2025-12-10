## Mission Ops Copilot Backend

A TypeScript backend service and CLI for spacecraft mission operations, built with Fastify, Commander, Zod, and a clean hexagonal architecture. It ingests telemetry snapshots, stores mission events and docs, and exposes deterministic anomaly detection via HTTP and CLI. This repo is a stable, deterministic backend focused on data and analysis.

### Features

- Fastify REST API with typed Zod schemas
- Commander CLI exercising the same application layer
- Clean Architecture: domain, application, infrastructure, interfaces
- Repositories: In-memory and file-based (JSON)
- Config via dotenv + Zod, strict TypeScript
- Logging via Pino wrapper, testable time provider
- Vitest unit and integration tests

### Core capabilities

- Register spacecraft and store per-spacecraft JSONB config (Postgres)
- Ingest telemetry snapshots per spacecraft
- Deterministic anomaly detection using config-defined parameter thresholds
- Clean REST routes and CLI around telemetry, events, docs, and spacecraft configs

### Getting Started

1. Install deps:
   ```bash
   pnpm install
   ```
2. Create env:
   ```bash
   cp .env.example .env
   ```
3. Run HTTP server:
   ```bash
   pnpm dev
   ```
4. Run CLI:
   ```bash
   pnpm dev:cli -- --help
   # or once built/linked:
   npx mission-ops-copilot --help
   ```

### Example API Calls

- Create telemetry:
  ```bash
  curl -X POST http://localhost:3000/telemetry \
    -H 'content-type: application/json' \
    -d '{"spacecraftId":"SC-001","timestamp":"2025-01-01T00:00:00Z","parameters":{"temp":42,"mode":"CRUISE"}}'
  ```
- Analyze telemetry:

  ```bash
  curl "http://localhost:3000/telemetry/analyze?spacecraftId=SC-001&limit=5"
  ```

- Spacecraft config (get/set):
  ```bash
  curl "http://localhost:3000/spacecraft/SC-001/config"
  curl -X PUT http://localhost:3000/spacecraft/SC-001/config \
    -H 'content-type: application/json' \
    -d '{"parameters":{"temp":{"warnHigh":45,"critHigh":70}}}'
  ```

### Example CLI Usage

```bash
pnpm dev:cli -- list-telemetry --spacecraft-id SC-001 --limit 10
pnpm dev:cli -- analyze-telemetry --spacecraft-id SC-001 --limit 10
```

### Scripts

- `pnpm dev` – run HTTP server (Fastify)
- `pnpm dev:cli` – run CLI entrypoint
- `pnpm build` – compile to `dist/`
- `pnpm start` – run compiled server
- `pnpm prisma:generate` – generate Prisma client
- `pnpm prisma:migrate:dev` – run dev migrations (or `db push`)
- `pnpm test` – run tests
- `pnpm lint` – eslint
- `pnpm format` – prettier check

### Docker

- Prereqs: Docker Desktop (or Docker Engine + Compose).

- One-time setup:

  ```bash
  cp example.env .env
  # Use Postgres inside Docker
  sed -i.bak 's/^DATA_BACKEND=.*/DATA_BACKEND=postgres/' .env
  echo 'DATABASE_URL_CONTAINER=postgresql://mission:mission@db:5432/mission_ops?schema=public' >> .env
  # Optional: ensure DB container credentials match compose defaults
  echo 'POSTGRES_DB=mission_ops' >> .env
  echo 'POSTGRES_USER=mission' >> .env
  echo 'POSTGRES_PASSWORD=mission' >> .env
  ```

- Start stack (db + migration + app):

  ```bash
  # Dev (with init script and dev roles)
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
  docker compose logs -f migrate
  # Expect to see:
  # "All migrations have been successfully applied."
  ```

- Call the API:

  ```bash
  curl -s "http://localhost:3000/telemetry?spacecraftId=SC-001&limit=5"
  ```

- Services:
  - `db`: Postgres 16 with healthcheck
  - `migrate`: runs `prisma migrate deploy` using DATABASE_URL_MIGRATOR_CONTAINER (elevated)
  - `app`: Fastify server on port 3000 (DATA_BACKEND=postgres) using DATABASE_URL_APP_CONTAINER (least-privilege)

- Reset data (DROPS volumes):

  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
  ```

- If migrations fail with baseline error (P3005):
  ```bash
  # Option A: destructive reset
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v && \
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
  # Option B: baseline existing schema
  docker compose run --rm migrate sh -lc \
    'pnpm prisma migrate resolve --applied 0001_init && pnpm prisma migrate deploy'
  ```

### Prisma schema versioning

- Local development:
  - Evolve schema in `prisma/schema.prisma`
  - Create a migration with:
    ```bash
    pnpm prisma:migrate:dev --name <change_description>
    ```
  - Commit the generated `prisma/migrations/**` files.
- Production / Docker:
  - The `migrate` service runs:
    ```bash
    pnpm prisma:migrate:deploy
    ```
    which applies committed migrations in order.
  - Do not use `db push` in production; it is non-versioned.

### Dev least-privilege Postgres

- Dev compose initializes two roles and a dedicated schema `app` via `prisma/init.dev.sql`:
  - `mission_migrator`: owner of schema `app`, allowed to CREATE/ALTER (migrations)
  - `mission_app`: DML-only on `app` objects (SELECT/INSERT/UPDATE/DELETE)
- Env URLs:
  - `DATABASE_URL_MIGRATOR_CONTAINER=postgresql://mission_migrator:mission_migrator@db:5432/mission_ops?schema=app`
  - `DATABASE_URL_APP_CONTAINER=postgresql://mission_app:mission_app@db:5432/mission_ops?schema=app`

### Production

- Use only `docker-compose.yml` (do not include the dev override).
- Provision roles/schema outside of compose (IaC/DBA). Set:
  - DATABASE_URL for your migration job to the migrator role
  - DATABASE_URL for the app deployment to the app role

### Architecture

- `src/domain` – entities, value objects, domain errors
- `src/application` – services/use cases, no HTTP/CLI
- `src/infrastructure` – repos, logging, time
- `src/interfaces/http` – Fastify routes/controllers
- `src/interfaces/cli` – Commander commands

### Roadmap

- Auth / multi-tenant support
- Real telemetry ingestion pipeline
