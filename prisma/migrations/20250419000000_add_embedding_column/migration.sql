-- 创建 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 添加 embedding 列到 Chunk 表
ALTER TABLE "Chunk" ADD COLUMN "embedding" vector(1536); 