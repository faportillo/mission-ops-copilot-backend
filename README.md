## Mission Ops Copilot Backend

# MissionOps

**MissionOps** is a backend service for managing and analyzing **spacecraft operational data**.

It provides a unified system for working with:

- spacecraft
- telemetry
- operational documents
- detected anomalies
- derived operational events

The goal is to make spacecraft operations data **structured, queryable, and actionable**, while remaining flexible enough to support many different mission types.

---

## Spacecraft

MissionOps models spacecraft as first-class entities.

Each spacecraft can have:

- identifying metadata (name, mission type, etc.)
- a configurable set of parameters and tolerances
- associated telemetry streams
- associated operational documents

This allows all operational data to be organized and queried on a per-spacecraft basis.

---

## Telemetry

MissionOps ingests spacecraft telemetry as time-series data.

Telemetry:

- supports arbitrary parameters depending on spacecraft type
- can represent multiple subsystems (thermal, power, communications, etc.)
- is stored in a way that allows both historical analysis and real-time inspection

Telemetry data can be queried directly or analyzed to detect anomalies.

---

## Anomaly Detection

MissionOps supports rule-based anomaly detection over telemetry data.

Anomalies:

- are evaluated using spacecraft-specific thresholds and tolerances
- are persisted as first-class records
- include severity, timing, and contextual information

This makes it possible to review both current and historical operational issues in a consistent way.

---

## Operational Documents

MissionOps stores and manages operational documents such as:

- spacecraft configuration specifications
- telemetry definitions
- operational procedures
- mission notes and reports

Documents:

- can be linked to a spacecraft or stored independently
- are categorized and searchable
- can be used as inputs to downstream analysis or automation

Documents are treated as **human-authored operational knowledge**, distinct from structured configuration data.

---

## Events

As data is ingested and analyzed, MissionOps records operational events such as:

- documents being published
- anomalies being detected
- configuration changes

These events provide a reliable history of what happened and can be used to trigger downstream processing or integrations.

---

## Interfaces

MissionOps exposes functionality via:

- a REST API for programmatic access and testing
- CLI tools for seeding data, running simulations, and local workflows

---

MissionOps is designed to serve as a **foundation for spacecraft operations tooling**, enabling analytics, automation, and higher-level decision support systems to be built on t

### Features

- Fastify REST API with typed Zod schemas
- Commander CLI exercising the same application layer
- Clean Architecture: domain, application, infrastructure, interfaces
- Repositories: In-memory and file-based (JSON)
- Config via dotenv + Zod, strict TypeScript
- Logging via Pino wrapper, testable time provider
- Vitest unit and integration tests
- Built-in demo simulation and data seeding (deterministic-friendly, AI-free)

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

### Makefile shortcuts

Common tasks are available via `Makefile`:

```bash
# Start the full stack (db + migrate + app)
make up

# Seed demo data inside the app container
# Defaults: 120 minutes per spacecraft @ 60s interval
make seed
# Customize:
make seed DURATION=60 INTERVAL=30
# Dry-run (no writes):
make seed DRY=1

# Follow logs
make logs           # all
make logs-app       # app only
make logs-db        # db only

# Reset EVERYTHING (drops volumes), then rebuild and start
make reset

# Prisma/migrations
make migrate            # run migrate deploy in container
make prisma-generate    # local prisma generate
make prisma-migrate-dev # local dev migrations

# Utilities
make env    # show app container DATA_BACKEND and DATABASE_URL
make psql   # open psql in db container
```

### Simulation and Demo Seeding

This repo includes a simple telemetry simulation layer and a seeding command to populate demo spacecraft, configurations, and historical telemetry.

- Folder: `src/simulation/`
  - `spacecraftProfiles.ts`: Four demo profiles with configs and thresholds:
    - `LEO_IMAGING`: parameters like `battery_soc`, `battery_temp`, `bus_voltage`, `solar_array_current`, `panel_temp`, `payload_temp`, `attitude_error_deg`, `rw{1,2}_speed_rpm`, `images_captured`, `imaging_mode`
    - `GNSS`: `battery_soc`, `bus_voltage`, `clock_drift_ppb`, `clock_bias_ns`, `nav_signal_power_dbm`, `nav_snr_db`
    - `GEO_COMMS`: `battery_soc`, `bus_voltage`, `payload_power_w`, `transponder_load_pct`, `uplink_snr_db`, `downlink_snr_db`, `bus_temp`, `payload_temp`
    - `CUBESAT`: `battery_soc`, `bus_voltage`, `attitude_error_deg`, `magnetorquer_current_ma`, `beacon_rssi_dbm`, `beacon_snr_db`, `mode`
  - `telemetrySimulator.ts`: Generates historical snapshots with small random jitter and occasional spikes to exercise anomaly thresholds.

- CLI seeding command (local):

  ```bash
  # Seed 120 minutes of telemetry per spacecraft at 60s intervals (defaults)
  pnpm dev:cli -- seed-demo-data

  # Customize duration and interval
  pnpm dev:cli -- seed-demo-data 60 30

  # Dry-run mode (no writes)
  pnpm dev:cli -- seed-demo-data 60 30 --dry-run
  ```

  - The seeder:
    - Upserts spacecraft by name with the appropriate `missionType`
    - Upserts per-spacecraft config (JSONB) via the `SpacecraftConfigService`
    - Simulates telemetry history into the configured repository
  - Dry-run prints progress without modifying the database or files.

With Docker, prefer the Makefile target which runs inside the container:

```bash
make up
make seed DURATION=60 INTERVAL=30
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
# Seed demo data
#         120 = duration (minutes of telemetry per spacecraft)
#          60 = interval (seconds between telemetry samples)
pnpm dev:cli -- seed-demo-data 120 60

#          60 = duration (minutes)
#          30 = interval (seconds)
#   --dry-run skips all DB writes; prints actions only
pnpm dev:cli -- seed-demo-data 60 30 --dry-run
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

### Docker (now with Makefile)

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
  make up
  make logs-migrate
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
  make reset
  ```

- If migrations fail with baseline error (P3005):
  ```bash
  # Option A: destructive reset
  make reset
  # Option B: baseline existing schema
  docker compose run --rm migrate sh -lc 'pnpm prisma migrate resolve --applied 0001_init && pnpm prisma migrate deploy'
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
- `src/simulation` – demo spacecraft profiles and deterministic-friendly telemetry simulator

### Roadmap

- Auth / multi-tenant support
- Real telemetry ingestion pipeline
