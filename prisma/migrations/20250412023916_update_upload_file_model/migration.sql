/*
  Warnings:

  - A unique constraint covering the columns `[uploadFileId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('UNPROCESSED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "uploadFileId" TEXT;

-- CreateTable
CREATE TABLE "UploadFile" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(500) NOT NULL,
    "size" INTEGER NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL DEFAULT 'upload',
    "status" "FileStatus" NOT NULL DEFAULT 'UNPROCESSED',
    "thumbnail" VARCHAR(500),
    "create_date" TIMESTAMP(3) NOT NULL,
    "create_time" BIGINT NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "parser_id" VARCHAR(100),
    "parser_config" JSONB NOT NULL,
    "summary" TEXT,
    "metadata" JSONB,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processing_error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadFile_status_idx" ON "UploadFile"("status");

-- CreateIndex
CREATE INDEX "UploadFile_processing_status_idx" ON "UploadFile"("processing_status");

-- CreateIndex
CREATE INDEX "UploadFile_createdAt_idx" ON "UploadFile"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_uploadFileId_key" ON "Document"("uploadFileId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadFileId_fkey" FOREIGN KEY ("uploadFileId") REFERENCES "UploadFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
