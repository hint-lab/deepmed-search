'use server';

import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { ProviderFactory, ProviderType } from '@/lib/llm-provider';

// --- Language Code to Full Name Mapping ---
// (可以根据需要扩展更多语言)
const languageCodeToNameMap: { [key: string]: string } = {
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ko': 'Korean',
    // ... 添加更多语言 ...
};

/**
 * 根据语言代码获取完整的语言名称，如果找不到则返回代码本身。
 */
function getLanguageName(code: string): string {
    return languageCodeToNameMap[code.toLowerCase()] || code;
}

/**
 * 使用 LLM 执行翻译的核心逻辑。
 * @param text 要翻译的文本。
 * @param targetLanguageCode 目标语言代码 (例如 'en', 'zh')。
 * @param sourceLanguageCode 可选：源语言代码。
 * @param userId 用户ID（可选），用于获取用户特定的API配置。
 * @returns 翻译后的文本。
 */
async function performTranslation(text: string, targetLanguageCode: string, sourceLanguageCode?: string, userId?: string | null): Promise<string> {

    const targetLanguageName = getLanguageName(targetLanguageCode);
    const sourceLanguageName = sourceLanguageCode ? getLanguageName(sourceLanguageCode) : 'the original language';

    console.log(`Requesting LLM translation for "${text.substring(0, 50)}..." from ${sourceLanguageName} (${sourceLanguageCode || 'auto'}) to ${targetLanguageName} (${targetLanguageCode})`);

    // --- 使用映射后的语言名称构建 LLM Prompt ---
    // 指示 LLM 仅输出翻译文本
    const prompt = `Translate the following text from ${sourceLanguageName} to ${targetLanguageName}. Output ONLY the translated text, without any introductory phrases, explanations, or quotation marks:\n\n"${text}"`;

    console.log("Generated LLM Prompt:", prompt);

    try {
        // 使用 LLM Provider 进行非流式调用
        const provider = await ProviderFactory.getProviderForUser(ProviderType.DeepSeek, userId);
        const response = await provider.chat({
            dialogId: 'translation_context',
            input: prompt,
        });

        if (!response || !response.content) {
            throw new Error('LLM translation failed or returned empty content.');
        }

        // 清理可能的前后空格或LLM添加的不必要字符
        const translatedText = response.content.trim();
        console.log("LLM Raw Response Content:", response.content);
        console.log("Trimmed Translated Text:", translatedText);

        return translatedText;

    } catch (error) {
        console.error("Error calling chatClient for translation:", error);
        // 将底层错误重新抛出，以便外层 try/catch 可以捕获
        throw new Error(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}


/**
 * 将文本翻译成指定的目标语言。
 */
export const translateTextAction = withAuth(async (
    session,
    data: {
        text: string;
        targetLanguage: string; // 这里接收的仍然是代码, e.g., 'en', 'zh'
        sourceLanguage?: string;
    }
): Promise<APIResponse<{ translatedText: string }>> => {
    // ... 函数其余部分保持不变 ...
    const { text, targetLanguage, sourceLanguage } = data;

    if (!text || !targetLanguage) {
        return { success: false, error: 'Text and target language are required.' };
    }

    console.log('Initiating translation action:', {
        userId: session.user.id,
        targetLanguageCode: targetLanguage, // 使用代码记录日志
        sourceLanguageCode: sourceLanguage || 'auto',
        textLength: text.length
    });

    try {
        // 调用核心翻译逻辑，传递语言代码和用户ID
        const translatedText = await performTranslation(text, targetLanguage, sourceLanguage, session.user.id);

        console.log('Translation successful:', {
            userId: session.user.id,
            targetLanguageCode: targetLanguage,
            translatedTextLength: translatedText.length
        });

        return {
            success: true,
            data: { translatedText }
        };

    } catch (error: any) {
        console.error('Translation action failed:', {
            error,
            userId: session.user.id,
            targetLanguageCode: targetLanguage,
            sourceLanguageCode: sourceLanguage,
            textLength: text.length
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unknown error occurred during translation.'
        };
    }
});

// Optional: Add other translation-related actions if needed
// export const detectLanguageAction = withAuth(async (...) => { ... });