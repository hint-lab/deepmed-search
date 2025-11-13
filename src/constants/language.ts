export const SUPPORTED_KB_LANGUAGES = ['zh', 'en', 'ja', 'ko', 'fr', 'ar'] as const;
export type KnowledgeBaseLanguage = (typeof SUPPORTED_KB_LANGUAGES)[number];

export const DEFAULT_KB_LANGUAGE: KnowledgeBaseLanguage = 'en';

const MINERU_LANGUAGE_MAPPING: Record<KnowledgeBaseLanguage, string> = {
    zh: 'ch',        // 简体中文 -> MinerU 使用 'ch'
    en: 'en',        // 英文 -> MinerU 使用 'en'
    ja: 'japan',     // 日语 -> MinerU 使用 'japan'
    ko: 'korean',    // 韩语 -> MinerU 使用 'korean'
    fr: 'en',        // MinerU 当前未提供法语模型，回退到英文
    ar: 'en',        // MinerU 当前未提供阿语模型，回退到英文
};

/**
 * MarkItDown 语言映射
 * MarkItDown 通常使用 ISO 639-1 代码，但某些语言可能需要特殊处理
 * 注意：MarkItDown 库本身可能不直接支持语言参数，但为了统一接口和未来扩展，保留映射逻辑
 */
const MARKITDOWN_LANGUAGE_MAPPING: Record<KnowledgeBaseLanguage, string> = {
    zh: 'zh',        // 简体中文 -> ISO 639-1 'zh'
    en: 'en',        // 英文 -> ISO 639-1 'en'
    ja: 'ja',        // 日语 -> ISO 639-1 'ja'
    ko: 'ko',        // 韩语 -> ISO 639-1 'ko'
    fr: 'fr',        // 法语 -> ISO 639-1 'fr'
    ar: 'ar',        // 阿拉伯语 -> ISO 639-1 'ar'
};

const CJK_LANGUAGES: ReadonlySet<KnowledgeBaseLanguage> = new Set(['zh', 'ja', 'ko']);

/**
 * 规范化语言编码，去掉区域后缀并确保在支持列表内
 */
export function normalizeLanguage(language?: string | null): KnowledgeBaseLanguage {
    if (!language) {
        return DEFAULT_KB_LANGUAGE;
    }

    const normalized = language.toLowerCase().split(/[-_]/)[0] as KnowledgeBaseLanguage;
    if ((SUPPORTED_KB_LANGUAGES as readonly string[]).includes(normalized)) {
        return normalized;
    }
    return DEFAULT_KB_LANGUAGE;
}

export function mapToMineruLanguage(language?: string | null): string {
    const normalized = normalizeLanguage(language);
    return MINERU_LANGUAGE_MAPPING[normalized] || MINERU_LANGUAGE_MAPPING[DEFAULT_KB_LANGUAGE];
}

export function mapToMarkitdownLanguage(language?: string | null): string {
    const normalized = normalizeLanguage(language);
    return MARKITDOWN_LANGUAGE_MAPPING[normalized] || MARKITDOWN_LANGUAGE_MAPPING[DEFAULT_KB_LANGUAGE];
}

export function isCjkLanguage(language?: string | null): boolean {
    const normalized = normalizeLanguage(language);
    return CJK_LANGUAGES.has(normalized);
}

export function getChunkingDefaultsForLanguage(language?: string | null) {
    const normalized = normalizeLanguage(language);

    if (isCjkLanguage(normalized)) {
        return {
            maxChunkSize: 1200,
            overlapSize: 120,
            parserMode: 'rule_segmentation' as const,
            splitByParagraph: true,
        };
    }

    return {
        maxChunkSize: 1800,
        overlapSize: 200,
        parserMode: 'llm_segmentation' as const,
        splitByParagraph: true,
    };
}

const TEXT_CLEANER_PROMPTS: Record<KnowledgeBaseLanguage, string> = {
    zh: `你是一名专业的文本清理助手，请清理 PDF 提取文本中的多余换行，保持中文段落结构。

要求：
1. 合并同一句话被拆开的换行；
2. 保留段落或章节之间的空行；
3. 保持表格、列表、公式等结构；
4. 不新增、不删除原文内容。`,
    en: `You are a text-cleaning assistant. Remove unwanted line breaks from PDF-extracted text while preserving English paragraph structure.

Rules:
1. Merge line breaks that split a sentence;
2. Keep blank lines between paragraphs or sections;
3. Preserve tables, lists, formulas, and bullet structures;
4. Do not add, remove, or alter the original wording.`,
    ja: `あなたはテキスト整形アシスタントです。PDF から抽出した日本語テキストの不要な改行を除去し、段落構造を保ってください。

ルール:
1. 1 つの文が途中で改行されている場合は結合する;
2. 段落やセクション間の空行は残す;
3. 表・リスト・数式などの構造は維持する;
4. 元の文章を追加・削除・改変しない。`,
    ko: `당신은 텍스트 정리 도우미입니다. PDF에서 추출한 한국어 텍스트의 불필요한 줄바꿈을 제거하고 단락 구조를 유지하세요.

규칙:
1. 한 문장이 중간에 줄바꿈된 경우 하나로 합치기;
2. 단락/섹션 사이의 빈 줄은 유지하기;
3. 표, 목록, 수식 등의 구조는 유지하기;
4. 원문 내용을 추가/삭제/변경하지 않기.`,
    fr: `Vous êtes un assistant de nettoyage de texte. Supprimez les sauts de ligne inutiles d’un texte PDF extrait en conservant la structure des paragraphes français.

Règles :
1. Fusionner les sauts de ligne qui coupent une même phrase ;
2. Conserver les lignes vides entre paragraphes ou sections ;
3. Préserver tables, listes, formules et puces ;
4. Ne pas ajouter, supprimer ou modifier le contenu original.`,
    ar: `أنت مساعد لتنظيف النصوص. أزل فواصل الأسطر غير الضرورية من النص العربي المستخرج من ملفات PDF مع الحفاظ على بنية الفقرات.

القواعد:
1. دمج فواصل الأسطر التي تقطع الجملة الواحدة؛
2. الإبقاء على الأسطر الفارغة بين الفقرات أو الأقسام؛
3. الحفاظ على الجداول والقوائم والصيغ الرياضية؛
4. عدم إضافة أو حذف أو تغيير نص المحتوى الأصلي.`,
};

export function getTextCleanerPrompt(language?: string | null): string {
    const normalized = normalizeLanguage(language);
    return TEXT_CLEANER_PROMPTS[normalized] || TEXT_CLEANER_PROMPTS[DEFAULT_KB_LANGUAGE];
}

