/*
  Warnings:

  - The values [PROCESSING,PROCESSED] on the enum `DocumentProcessingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentProcessingStatus_new" AS ENUM ('UNPROCESSED', 'CONVERTING', 'INDEXING', 'SUCCESSED', 'FAILED');
ALTER TABLE "Document" ALTER COLUMN "processing_status" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "processing_status" TYPE "DocumentProcessingStatus_new" USING ("processing_status"::text::"DocumentProcessingStatus_new");
ALTER TYPE "DocumentProcessingStatus" RENAME TO "DocumentProcessingStatus_old";
ALTER TYPE "DocumentProcessingStatus_new" RENAME TO "DocumentProcessingStatus";
DROP TYPE "DocumentProcessingStatus_old";
ALTER TABLE "Document" ALTER COLUMN "processing_status" SET DEFAULT 'UNPROCESSED';
COMMIT;
