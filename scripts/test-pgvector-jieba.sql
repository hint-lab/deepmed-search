-- 测试 pgvector 功能
DO $$
DECLARE
    v1 vector := '[1,2,3]'::vector;
    v2 vector := '[4,5,6]'::vector;
    distance float;
    cosine_distance float;
    dot_product float;
BEGIN
    RAISE NOTICE '测试 pgvector 功能...';
    
    -- 计算向量距离
    distance := v1 <-> v2;
    cosine_distance := v1 <=> v2;
    dot_product := v1 <#> v2;
    
    -- 输出结果
    RAISE NOTICE '欧氏距离: %', distance;
    RAISE NOTICE '余弦距离: %', cosine_distance;
    RAISE NOTICE '点积: %', dot_product;
    
    RAISE NOTICE 'pgvector 测试完成';
END $$;

-- 测试 jieba_cfg 功能
DO $$
DECLARE
    ts_result tsvector;
    tsq_result tsquery;
BEGIN
    RAISE NOTICE '测试 jieba_cfg 功能...';
    
    -- 测试中文分词
    ts_result := to_tsvector('jieba_cfg', '这是一个中文测试，我们正在测试结巴分词的功能');
    RAISE NOTICE '分词结果: %', ts_result;
    
    -- 测试中文搜索（使用更明确的测试词）
    tsq_result := to_tsquery('jieba_cfg', '结巴 & 分词');
    RAISE NOTICE '搜索查询结果: %', tsq_result;
    
    -- 测试搜索匹配
    IF to_tsvector('jieba_cfg', '这是一个结巴分词的测试') @@ tsq_result THEN
        RAISE NOTICE '搜索匹配测试: 成功匹配';
    ELSE
        RAISE NOTICE '搜索匹配测试: 未匹配';
    END IF;
    
    RAISE NOTICE 'jieba_cfg 测试完成';
END $$; 