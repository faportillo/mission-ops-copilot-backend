-- OpsDocument schema alignment: add spacecraftId/category/publishedAt and rename content->body

-- Add spacecraftId if missing
ALTER TABLE "OpsDocument"
ADD COLUMN IF NOT EXISTS "spacecraftId" TEXT;

-- Add category (non-null) with a safe default for existing rows
ALTER TABLE "OpsDocument"
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';

-- Rename content -> body when applicable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OpsDocument'
      AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OpsDocument'
      AND column_name = 'body'
  ) THEN
    EXECUTE 'ALTER TABLE "OpsDocument" RENAME COLUMN "content" TO "body"';
  END IF;
END $$;

-- Add publishedAt if missing
ALTER TABLE "OpsDocument"
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();


