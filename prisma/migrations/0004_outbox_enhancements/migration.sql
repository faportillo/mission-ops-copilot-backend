-- Create OutboxEvent table if missing, else add columns if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'OutboxEvent'
  ) THEN
    CREATE TABLE "OutboxEvent" (
      "id" TEXT PRIMARY KEY,
      "type" TEXT NOT NULL,
      "topic" TEXT NOT NULL,
      "key" TEXT,
      "headers" JSONB,
      "payload" JSONB NOT NULL,
      "availableAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "processed_at" TIMESTAMPTZ,
      "retries" INT NOT NULL DEFAULT 0,
      "lastError" TEXT
    );
  ELSE
    -- Add columns defensively
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'OutboxEvent' AND column_name = 'topic') THEN
      ALTER TABLE "OutboxEvent" ADD COLUMN "topic" TEXT NOT NULL DEFAULT 'default';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'OutboxEvent' AND column_name = 'key') THEN
      ALTER TABLE "OutboxEvent" ADD COLUMN "key" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'OutboxEvent' AND column_name = 'headers') THEN
      ALTER TABLE "OutboxEvent" ADD COLUMN "headers" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'OutboxEvent' AND column_name = 'availableAt') THEN
      ALTER TABLE "OutboxEvent" ADD COLUMN "availableAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'OutboxEvent' AND column_name = 'lastError') THEN
      ALTER TABLE "OutboxEvent" ADD COLUMN "lastError" TEXT;
    END IF;
  END IF;
END $$;

