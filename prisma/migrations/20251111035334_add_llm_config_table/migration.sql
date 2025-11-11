/*
  Warnings:

  - You are about to drop the column `llmApiKey` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `llmBaseUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `llmModel` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `llmProvider` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `llmReasonModel` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "llmApiKey",
DROP COLUMN "llmBaseUrl",
DROP COLUMN "llmModel",
DROP COLUMN "llmProvider",
DROP COLUMN "llmReasonModel";

-- CreateTable
CREATE TABLE "LLMConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT,
    "reasonModel" TEXT,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LLMConfig_userId_idx" ON "LLMConfig"("userId");

-- CreateIndex
CREATE INDEX "LLMConfig_userId_isActive_idx" ON "LLMConfig"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "LLMConfig" ADD CONSTRAINT "LLMConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
