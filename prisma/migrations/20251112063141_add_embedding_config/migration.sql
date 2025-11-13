-- AlterTable
ALTER TABLE "SearchConfig" ADD COLUMN     "embeddingApiKey" TEXT,
ADD COLUMN     "embeddingBaseUrl" TEXT,
ADD COLUMN     "embeddingDimension" INTEGER NOT NULL DEFAULT 1536,
ADD COLUMN     "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
ADD COLUMN     "embeddingProvider" TEXT NOT NULL DEFAULT 'openai';
