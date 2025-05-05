/*
  Warnings:

  - You are about to drop the `CollectedPubMedArticle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CollectedPubMedArticle" DROP CONSTRAINT "CollectedPubMedArticle_userId_fkey";

-- DropTable
DROP TABLE "CollectedPubMedArticle";
