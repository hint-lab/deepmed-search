/*
  Warnings:

  - You are about to drop the column `chat_id` on the `Tenant` table. All the data in the column will be lost.
  - The `parser_ids` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isThinking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thinkingContent" TEXT;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "chat_id",
DROP COLUMN "parser_ids",
ADD COLUMN     "parser_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
