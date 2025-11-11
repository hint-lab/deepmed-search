-- AlterTable
ALTER TABLE "KnowledgeBase" ALTER COLUMN "chunk_size" SET DEFAULT 2000,
ALTER COLUMN "overlap_size" SET DEFAULT 200;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "llmApiKey" TEXT,
ADD COLUMN     "llmBaseUrl" TEXT,
ADD COLUMN     "llmModel" TEXT,
ADD COLUMN     "llmProvider" TEXT,
ADD COLUMN     "llmReasonModel" TEXT;
