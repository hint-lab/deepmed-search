import logger from '@/utils/logger';
import { createProviderFromUserConfig } from '@/lib/llm-provider';
import { v4 as uuidv4 } from 'uuid';

/**
 * 使用 LLM 清理文本中的多余换行
 * 主要解决 PDF 提取时的换行问题
 */
export async function cleanTextWithLLM(
  text: string,
  options: {
    model?: string;
    userId: string; // 用户ID（必需：使用用户配置的 LLM）
  }
): Promise<{ success: boolean; cleanedText?: string; error?: string }> {
  const startTime = Date.now();

  try {
    // 如果文本为空或很短，直接返回
    if (!text || text.trim().length < 100) {
      return {
        success: true,
        cleanedText: text,
      };
    }

    // 获取 LLM Provider
    // 注意：必须提供 userId，所有 API Key 都必须由用户配置
    if (!options.userId) {
      throw new Error('必须提供 userId 参数。所有 LLM API Key 必须由用户在 /settings/llm 页面配置');
    }

    let provider;
    try {
      // 使用用户配置的 Provider
      provider = await createProviderFromUserConfig(options.userId);
    } catch (error) {
      throw new Error(`未配置 LLM API Key。请访问 /settings/llm 页面配置您的 API Key。错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    logger.info('[Text Cleaner] 开始清理文本', {
      textLength: text.length,
      provider: provider.type,
      model: provider.model,
    });

    // 生成一个临时的 dialogId 用于此次清理任务
    const dialogId = `text-cleaner-${uuidv4()}`;

    const systemPrompt = `你是一个专业的文本清理助手。你的任务是清理PDF提取文本中的多余换行，使文本更易读。

规则：
1. **合并句子内的换行**：如果一个句子因为PDF排版被拆成多行，请将它们合并成一个完整的句子
2. **保留段落换行**：保留段落之间的换行（通常是双换行或明显的段落结束）
3. **保留表格结构**：如果是表格内容，保持表格的行列结构
4. **保留列表结构**：保持编号列表、项目符号列表的结构
5. **不要改变内容**：只修正换行，不要修改、删除或添加任何文字内容
6. **保留专业术语**：医学术语、公式、数字保持原样

示例：
输入：
"慢性髓性白血病（CML）是一种骨髓增殖性肿
瘤，其特征是费城染色体阳性，导致BCR-ABL融
合基因的形成。"

输出：
"慢性髓性白血病（CML）是一种骨髓增殖性肿瘤，其特征是费城染色体阳性，导致BCR-ABL融合基因的形成。"

请直接返回清理后的文本，不要添加任何说明或额外内容。`;

    // 设置系统提示词
    provider.setSystemPrompt(dialogId, systemPrompt);

    // 设置超时时间（默认 2 分钟，长文本可能需要更长时间，但最多不超过 5 分钟）
    // 计算方式：至少2分钟，每100字符增加1秒，但最多5分钟
    const calculatedTimeout = Math.max(120000, Math.ceil(text.length / 100) * 1000);
    const timeoutMs = Math.min(calculatedTimeout, 300000); // 最多5分钟
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`文本清理超时（${timeoutMs}ms）。文本长度: ${text.length} 字符`));
      }, timeoutMs);
    });

    logger.info('[Text Cleaner] 调用 LLM API', {
      dialogId,
      timeoutMs,
      estimatedTimeout: `${Math.round(timeoutMs / 1000)}秒`,
    });

    // 调用 provider 进行文本清理（带超时保护）
    const chatPromise = provider.chat({
      dialogId,
      input: `请清理以下文本中的多余换行：\n\n${text}`,
    });

    let response;
    try {
      response = await Promise.race([chatPromise, timeoutPromise]);
    } catch (error) {
      // 超时或错误时也要清理临时对话历史
      provider.clearHistory(dialogId);
      throw error;
    }

    const cleanedText = response.content || text;
    const processingTime = Date.now() - startTime;

    // 清理临时对话历史
    provider.clearHistory(dialogId);

    logger.info('[Text Cleaner] 文本清理完成', {
      originalLength: text.length,
      cleanedLength: cleanedText.length,
      processingTime,
      provider: provider.type,
      usage: response.metadata.usage,
    });

    return {
      success: true,
      cleanedText,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : '未知错误';

    logger.error('[Text Cleaner] 文本清理失败', {
      processingTime,
      error: errorMsg,
    });

    // 如果清理失败，返回原文本
    return {
      success: false,
      cleanedText: text,
      error: errorMsg,
    };
  }
}

/**
 * 分批清理长文本
 * 将长文本分成多个块，分别清理，避免超出 token 限制
 */
export async function cleanLongText(
  text: string,
  options: {
    model?: string;
    maxChunkSize?: number;
    userId: string; // 用户ID（必需：使用用户配置的 LLM）
  }
): Promise<{ success: boolean; cleanedText?: string; error?: string }> {
  const maxChunkSize = options.maxChunkSize || 8000; // 约8000字符一块

  // 如果文本不长，直接处理
  if (text.length <= maxChunkSize) {
    return cleanTextWithLLM(text, { model: options.model, userId: options.userId });
  }

  logger.info('[Text Cleaner] 文本较长，分批处理', {
    totalLength: text.length,
    chunkSize: maxChunkSize,
  });

  try {
    // 按双换行分割段落
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    // 将段落组合成合适大小的块
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    logger.info('[Text Cleaner] 分割完成', {
      chunksCount: chunks.length,
    });

    // 逐块清理
    const cleanedChunks: string[] = [];
    const chunkStartTime = Date.now();
    for (let i = 0; i < chunks.length; i++) {
      const chunkStart = Date.now();
      logger.info('[Text Cleaner] 处理块', {
        index: i + 1,
        total: chunks.length,
        chunkLength: chunks[i].length,
        elapsedTime: Date.now() - chunkStartTime,
      });

      try {
        const result = await cleanTextWithLLM(chunks[i], { model: options.model, userId: options.userId });
        const chunkTime = Date.now() - chunkStart;
        if (result.success && result.cleanedText) {
          cleanedChunks.push(result.cleanedText);
          logger.info('[Text Cleaner] 块处理完成', {
            index: i + 1,
            total: chunks.length,
            chunkTime,
            success: true,
          });
        } else {
          // 如果某块清理失败，使用原文本
          cleanedChunks.push(chunks[i]);
          logger.warn('[Text Cleaner] 块处理失败，使用原文本', {
            index: i + 1,
            total: chunks.length,
            error: result.error,
          });
        }
      } catch (error) {
        const chunkTime = Date.now() - chunkStart;
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        logger.error('[Text Cleaner] 块处理异常', {
          index: i + 1,
          total: chunks.length,
          chunkTime,
          error: errorMsg,
        });
        // 如果某块清理失败，使用原文本
        cleanedChunks.push(chunks[i]);
      }
    }

    const cleanedText = cleanedChunks.join('\n\n');

    return {
      success: true,
      cleanedText,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';

    logger.error('[Text Cleaner] 分批清理失败', {
      error: errorMsg,
    });

    return {
      success: false,
      cleanedText: text,
      error: errorMsg,
    };
  }
}

