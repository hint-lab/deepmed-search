-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "markdown_content" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "processing_error" TEXT,
ADD COLUMN     "processing_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "summary" TEXT;
