/*
  Warnings:

  - You are about to drop the column `separator` on the `KnowledgeBase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KnowledgeBase" DROP COLUMN "separator",
ADD COLUMN     "separators" TEXT[] DEFAULT ARRAY[]::TEXT[];
