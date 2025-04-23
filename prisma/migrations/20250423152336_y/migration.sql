-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('UNPROCESSED', 'CONVERTING', 'INDEXING', 'SUCCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileUploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "password" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "embd_id" TEXT,
    "llm_id" TEXT,
    "asr_id" TEXT,
    "parser_ids" TEXT,
    "chat_id" TEXT,
    "speech2text_id" TEXT,
    "tts_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dialog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dialog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "dialogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemStatus" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "SystemToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "chunk_num" INTEGER NOT NULL DEFAULT 0,
    "doc_num" INTEGER NOT NULL DEFAULT 0,
    "parser_config" JSONB,
    "parser_id" TEXT,
    "permission" TEXT,
    "similarity_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tenant_id" TEXT,
    "token_num" INTEGER NOT NULL DEFAULT 0,
    "vector_similarity_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "embd_id" TEXT,
    "language" TEXT,
    "operator_permission" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "chunk_size" INTEGER NOT NULL DEFAULT 1000,
    "overlap_size" INTEGER NOT NULL DEFAULT 100,
    "split_by_paragraph" BOOLEAN NOT NULL DEFAULT false,
    "separator" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content_url" TEXT,
    "file_url" TEXT,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "processing_status" "DocumentProcessingStatus" NOT NULL DEFAULT 'UNPROCESSED',
    "thumbnail" TEXT,
    "chunk_num" INTEGER NOT NULL DEFAULT 0,
    "token_num" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progress_msg" TEXT,
    "process_begin_at" TIMESTAMP(3),
    "process_duation" INTEGER NOT NULL DEFAULT 0,
    "create_date" TIMESTAMP(3) NOT NULL,
    "create_time" BIGINT NOT NULL,
    "update_date" TIMESTAMP(3) NOT NULL,
    "update_time" BIGINT NOT NULL,
    "created_by" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "parser_id" TEXT,
    "parser_config" JSONB NOT NULL,
    "markdown_content" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "processing_error" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "uploadFileId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadFile" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(500) NOT NULL,
    "size" INTEGER NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "thumbnail" VARCHAR(500),
    "status" "FileUploadStatus" NOT NULL DEFAULT 'PENDING',
    "upload_progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "create_date" TIMESTAMP(3) NOT NULL,
    "create_time" BIGINT NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "parser_id" VARCHAR(100),
    "parser_config" JSONB NOT NULL,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "content_with_weight" TEXT NOT NULL,
    "available_int" INTEGER NOT NULL DEFAULT 1,
    "doc_id" TEXT NOT NULL,
    "doc_name" TEXT NOT NULL,
    "img_id" TEXT,
    "important_kwd" TEXT[],
    "question_kwd" TEXT[],
    "tag_kwd" TEXT[],
    "positions" JSONB NOT NULL,
    "tag_feas" JSONB,
    "kb_id" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "dialogId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Dialog_userId_idx" ON "Dialog"("userId");

-- CreateIndex
CREATE INDEX "Dialog_knowledgeBaseId_idx" ON "Dialog"("knowledgeBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemToken_token_key" ON "SystemToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Document_uploadFileId_key" ON "Document"("uploadFileId");

-- CreateIndex
CREATE INDEX "UploadFile_createdAt_idx" ON "UploadFile"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_chunk_id_key" ON "Chunk"("chunk_id");

-- CreateIndex
CREATE INDEX "_DocumentToTag_B_index" ON "_DocumentToTag"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dialog" ADD CONSTRAINT "Dialog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dialog" ADD CONSTRAINT "Dialog_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemToken" ADD CONSTRAINT "SystemToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadFileId_fkey" FOREIGN KEY ("uploadFileId") REFERENCES "UploadFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_kb_id_fkey" FOREIGN KEY ("kb_id") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedQuestion" ADD CONSTRAINT "RelatedQuestion_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToTag" ADD CONSTRAINT "_DocumentToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToTag" ADD CONSTRAINT "_DocumentToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
