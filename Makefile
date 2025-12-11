## Makefile shortcuts for Mission Ops Copilot
##
## Usage examples:
##   make up                       # start db+migrate+app
##   make seed                     # seed defaults: 120 min @ 60s
##   make seed DURATION=60 INTERVAL=30
##   make seed DRY=1               # dry-run (no writes)
##   make logs-app                 # follow app logs
##   make reset                    # drop volumes and rebuild
##   make migrate                  # run prisma migrate deploy in container
##   make prisma-generate          # generate prisma client locally
##   make test / make lint         # local test/lint
##
## Local CLI (against containerized DB) example:
##   make dev-cli-local ARGS="seed-demo-data 60 30 --dry-run" \
##     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mission_ops?schema=app" \
##     DATA_BACKEND=postgres

.PHONY: help up up-rebuild down down-v ps logs logs-app logs-db logs-migrate \
	build build-nocache migrate reset seed seed-docs seed-all env prisma-generate prisma-migrate-dev \
	prisma-migrate-deploy prisma-studio psql dev dev-cli-local test lint format format-fix

COMPOSE := docker compose -f docker-compose.yml -f docker-compose.dev.yml
APP     := app
DB      := db
MIGRATE := migrate

# Seed configuration (overridable)
DURATION ?= 120
INTERVAL ?= 60
FLAGS    :=
OVERWRITE ?= false
ifeq ($(DRY),1)
  FLAGS += --dry-run
endif

help:
	@echo "Targets:"
	@echo "  up                 Start db + migrate + app (detached)"
	@echo "  up-rebuild         Build and start (detached)"
	@echo "  down               Stop stack"
	@echo "  down-v             Stop and remove volumes (DANGEROUS)"
	@echo "  reset              Full reset: down -v then up --build"
	@echo "  ps                 Show compose services"
	@echo "  logs               Follow all logs"
	@echo "  logs-app           Follow app logs"
	@echo "  logs-db            Follow db logs"
	@echo "  logs-migrate       Follow migrate logs"
	@echo "  build              Build images"
	@echo "  build-nocache      Build images without cache"
	@echo "  migrate            Run prisma migrate deploy in container"
	@echo "  seed               Seed demo data in container (DURATION, INTERVAL, DRY=1)"
	@echo "  seed-docs          Seed operations documents (OVERWRITE=true|false, default false)"
	@echo "  seed-all           Seed demo data then seed ops docs"
	@echo "  env                Show app container DATA_BACKEND and DATABASE_URL"
	@echo "  prisma-generate    Generate Prisma client locally"
	@echo "  prisma-migrate-dev Run Prisma migrate dev locally"
	@echo "  prisma-migrate-deploy Run Prisma migrate deploy locally"
	@echo "  prisma-studio      Open Prisma Studio locally"
	@echo "  psql               psql into db container"
	@echo "  dev                Run local HTTP server (pnpm dev)"
	@echo "  dev-cli-local      Run local CLI (ARGS=\"...\")"
	@echo "  test               Run tests locally"
	@echo "  lint               Run eslint locally"
	@echo "  format             Prettier check"
	@echo "  format-fix         Prettier write"

up:
	$(COMPOSE) up -d

up-rebuild:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

down-v:
	$(COMPOSE) down -v

reset: down-v up-rebuild

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

logs-app:
	$(COMPOSE) logs -f $(APP)

logs-db:
	$(COMPOSE) logs -f $(DB)

logs-migrate:
	$(COMPOSE) logs -f $(MIGRATE)

build:
	$(COMPOSE) build

build-nocache:
	$(COMPOSE) build --no-cache

migrate:
	$(COMPOSE) run --rm $(MIGRATE) pnpm prisma migrate deploy

seed:
	$(COMPOSE) exec $(APP) node dist/interfaces/cli/index.js seed-demo-data $(DURATION) $(INTERVAL) $(FLAGS)

seed-docs:
	$(COMPOSE) exec $(APP) node dist/interfaces/cli/index.js seed-demo-docs $(OVERWRITE)

seed-all: seed seed-docs

env:
	$(COMPOSE) exec $(APP) sh -lc 'echo DATA_BACKEND=$$DATA_BACKEND; echo DATABASE_URL=$$DATABASE_URL'

psql:
	$(COMPOSE) exec $(DB) sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# Local development helpers
dev:
	pnpm dev

dev-cli-local:
	pnpm dev:cli -- $(ARGS)

test:
	pnpm test

lint:
	pnpm lint

format:
	pnpm format

format-fix:
	pnpm format:fix

