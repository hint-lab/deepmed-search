/**
 * Jina Dedup - 基于语义相似度的查询去重工具
 * 
 * 使用 Jina Embeddings API 进行语义去重，比 LLM 去重更快、更便宜、更稳定。
 * 
 * 核心算法：
 * 1. 为所有查询（新查询 + 已有查询）生成向量嵌入
 * 2. 计算新查询与已有查询之间的余弦相似度
 * 3. 相似度 >= 0.86 视为重复，过滤掉
 * 4. 新查询之间也进行去重，避免内部重复
 * 
 * 优势：
 * - 语义理解：能识别表述不同但意思相同的查询
 * - 高效：批量处理，一次 API 调用处理所有查询
 * - 稳定：不依赖 LLM 的随机性
 * 
 * 使用场景：
 * - search action: 避免重复搜索相同的关键词
 * - reflect action: 避免生成重复的子问题
 */

import { TokenTracker } from "../utils/token-tracker";
import { cosineSimilarity } from "./cosine";
import { getEmbeddings } from "./jina-embeddings";

const SIMILARITY_THRESHOLD = 0.86; // 相似度阈值，>= 此值视为重复


export async function dedupQueries(
  newQueries: string[],
  existingQueries: string[],
  tracker?: TokenTracker
): Promise<{ unique_queries: string[] }> {
  try {
    // ========== 快速路径：单个新查询且无历史查询 ==========
    if (newQueries?.length === 1 && (!existingQueries || existingQueries.length === 0)) {
      return {
        unique_queries: newQueries,
      };
    }

    // ========== 输入验证 ==========
    if (!newQueries || !existingQueries) {
      console.error("[dedupQueries] Error: Input arrays cannot be null/undefined.");
      return { unique_queries: newQueries || [] };
    }

    // ========== 批量生成嵌入向量 ==========
    // 将新查询和已有查询合并，一次性生成所有嵌入向量（提高效率）
    const combinedQueries = [...newQueries, ...existingQueries];
    const { embeddings: allEmbeddings } = await getEmbeddings(combinedQueries, tracker);

    // 如果 embedding 失败（如余额不足），返回所有新查询
    if (!allEmbeddings.length) {
      return {
        unique_queries: newQueries,
      };
    }

    // ========== 分离嵌入向量 ==========
    const newEmbeddings = allEmbeddings.slice(0, newQueries.length);
    const existingEmbeddings = allEmbeddings.slice(newQueries.length);

    const uniqueQueries: string[] = [];
    const usedIndices = new Set<number>();

    // ========== 去重逻辑 ==========
    for (let i = 0; i < newQueries.length; i++) {
      let isUnique = true;

      // 检查 1：与已有查询对比
      for (let j = 0; j < existingQueries.length; j++) {
        const similarity = cosineSimilarity(newEmbeddings[i], existingEmbeddings[j]);
        if (similarity >= SIMILARITY_THRESHOLD) {
          isUnique = false;
          break;
        }
      }

      // 检查 2：与已接受的新查询对比（避免新查询之间重复）
      if (isUnique) {
        for (const usedIndex of usedIndices) {
          const similarity = cosineSimilarity(newEmbeddings[i], newEmbeddings[usedIndex]);
          if (similarity >= SIMILARITY_THRESHOLD) {
            isUnique = false;
            break;
          }
        }
      }

      // 通过所有检查，添加到唯一查询列表
      if (isUnique) {
        uniqueQueries.push(newQueries[i]);
        usedIndices.add(i);
      }
    }
    console.log('Dedup:', uniqueQueries);
    return {
      unique_queries: uniqueQueries,
    };
  } catch (error) {
    console.error('Error in deduplication analysis:', error);

    // return all new queries if there is an error
    return {
      unique_queries: newQueries,
    };
  }
}
