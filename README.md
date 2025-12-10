## Mission Ops Copilot

A TypeScript backend service and CLI for spacecraft mission operations, built with Fastify, Commander, Zod, and a clean hexagonal architecture. It ingests telemetry snapshots, stores mission events and docs, and exposes use cases via HTTP and CLI. Ready to extend with real LLMs and databases.

### Features

- Fastify REST API with typed Zod schemas
- Commander CLI exercising the same application layer
- Clean Architecture: domain, application, infrastructure, interfaces
- Repositories: In-memory and file-based (JSON)
- Config via dotenv + Zod, strict TypeScript
- Logging via Pino wrapper, testable time provider
- Vitest unit and integration tests

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
- `pnpm test` – run tests
- `pnpm lint` – eslint
- `pnpm format` – prettier check

### Architecture

- `src/domain` – entities, value objects, domain errors
- `src/application` – services/use cases, no HTTP/CLI
- `src/infrastructure` – repos, logging, time, LLM stubs
- `src/interfaces/http` – Fastify routes/controllers
- `src/interfaces/cli` – Commander commands

### Roadmap

- Real OpenAI LLM client
- Auth / multi-tenant support
- Real telemetry ingestion pipeline
