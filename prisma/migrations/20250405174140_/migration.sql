/*
  Warnings:

  - You are about to drop the column `file_id` on the `Chunk` table. All the data in the column will be lost.
  - You are about to drop the `KnowledgeFile` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `create_date` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `create_time` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parser_config` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_type` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_date` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_time` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Chunk" DROP CONSTRAINT "Chunk_file_id_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeFile" DROP CONSTRAINT "KnowledgeFile_kb_id_fkey";

-- AlterTable
ALTER TABLE "Chunk" DROP COLUMN "file_id";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "chunk_num" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "create_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "create_time" BIGINT NOT NULL,
ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "parser_config" JSONB NOT NULL,
ADD COLUMN     "parser_id" TEXT,
ADD COLUMN     "process_begin_at" TIMESTAMP(3),
ADD COLUMN     "process_duation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress_msg" TEXT,
ADD COLUMN     "run" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "source_type" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'enabled',
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "token_num" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "update_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "update_time" BIGINT NOT NULL;

-- DropTable
DROP TABLE "KnowledgeFile";

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
