import { AnswerAction } from "@/lib/deep-research/types";

/**
 * 将普通文本答案转换为 Markdown 格式
 * @param answer 答案文本或 AnswerAction 对象
 * @returns Markdown 格式的答案
 */
export function buildMdFromAnswer(answer: string | AnswerAction): string {
    const text = typeof answer === 'string' ? answer : answer.answer;
    if (!text) return '';

    return text
        .replace(/\n/g, '\n\n')  // 确保段落之间有空行
        .replace(/([^.])\n/g, '$1 ')  // 合并不以句号结尾的行
        .trim();
}

/**
 * 移除多余的换行符
 * @param text 输入文本
 * @returns 处理后的文本
 */
export function removeExtraLineBreaks(text: string): string {
    return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * 修复代码块的缩进
 * @param text 输入文本
 * @returns 处理后的文本
 */
export function fixCodeBlockIndentation(text: string): string {
    return text.replace(/```[\w]*\n\s+/g, '```\n');
}

/**
 * 移除 HTML 标签
 * @param text 输入文本
 * @returns 处理后的文本
 */
export function removeHTMLtags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
}

/**
 * 将 HTML 表格转换为 Markdown 格式
 * @param text 输入文本
 * @returns 处理后的文本
 */
export function convertHtmlTablesToMd(text: string): string {
    // 简单的 HTML 表格转换
    return text.replace(/<table>[\s\S]*?<\/table>/g, (match) => {
        // 这里可以添加更复杂的表格转换逻辑
        return match
            .replace(/<tr>/g, '|')
            .replace(/<\/tr>/g, '|\n')
            .replace(/<td>|<th>/g, ' ')
            .replace(/<\/td>|<\/th>/g, ' |')
            .replace(/<\/?table>|<\/?thead>|<\/?tbody>/g, '');
    });
}

/**
 * 从数组中选择 K 个元素
 * @param arr 输入数组
 * @param k 要选择的元素数量
 * @returns 选择的元素数组
 */
export function chooseK<T>(arr: T[], k: number): T[] {
    if (k >= arr.length) return arr;
    const result: T[] = [];
    const used = new Set<number>();

    while (result.length < k) {
        const index = Math.floor(Math.random() * arr.length);
        if (!used.has(index)) {
            used.add(index);
            result.push(arr[index]);
        }
    }

    return result;
}

/**
 * 修复 Markdown 格式
 * @param text 输入文本
 * @returns 处理后的文本
 */
export function repairMarkdownFinal(text: string): string {
    return text
        .replace(/\*\*\*/g, '**')  // 修复错误的粗体斜体
        .replace(/_{3,}/g, '__')   // 修复错误的下划线
        .replace(/\n{3,}/g, '\n\n')  // 修复多余的换行
        .trim();
}

/**
 * 修复 Markdown 脚注
 * @param text 输入文本
 * @returns 处理后的文本
 */
export function repairMarkdownFootnotesOuter(text: string): string {
    if (!text) return '';

    return text
        .replace(/\[\^(\d+)\]/g, (_, num) => `[^${num}]`)  // 修复脚注引用
        .replace(/\[\^(\d+)\]:/g, (_, num) => `[^${num}]:`)  // 修复脚注定义
        .trim();
} 