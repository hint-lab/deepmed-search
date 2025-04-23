/*
  Warnings:

  - You are about to drop the column `create_date` on the `KnowledgeBase` table. All the data in the column will be lost.
  - You are about to drop the column `create_time` on the `KnowledgeBase` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `KnowledgeBase` table. All the data in the column will be lost.
  - You are about to drop the column `update_date` on the `KnowledgeBase` table. All the data in the column will be lost.
  - You are about to drop the column `update_time` on the `KnowledgeBase` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `KnowledgeBase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KnowledgeBase" DROP COLUMN "create_date",
DROP COLUMN "create_time",
DROP COLUMN "createdAt",
DROP COLUMN "update_date",
DROP COLUMN "update_time",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
