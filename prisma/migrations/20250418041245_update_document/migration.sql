/*
  Warnings:

  - You are about to drop the column `markdown_url` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "markdown_url",
ADD COLUMN     "file_url" TEXT;
