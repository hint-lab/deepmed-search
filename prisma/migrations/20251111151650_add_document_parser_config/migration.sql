-- AlterTable
ALTER TABLE "SearchConfig" ADD COLUMN     "documentParser" TEXT NOT NULL DEFAULT 'markitdown-docker',
ADD COLUMN     "mineruApiKey" TEXT;
