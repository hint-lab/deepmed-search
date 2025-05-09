-- 为 content_with_weight 列创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_chunk_content_fts_chinese
ON "Chunk" USING GIN (to_tsvector('jieba_cfg', content_with_weight));

-- 为 embedding 列创建向量索引
CREATE INDEX IF NOT EXISTS idx_chunk_embedding
ON "Chunk" USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- 可以根据数据量调整 lists 参数
