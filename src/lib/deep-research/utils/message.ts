import { CoreMessage } from 'ai';
import { KnowledgeItem } from '../types';
import { removeExtraLineBreaks } from './text-tools';

// 从知识项构建消息数组
export function BuildMsgsFromKnowledge(knowledge: KnowledgeItem[]): CoreMessage[] {
    const messages: CoreMessage[] = [];
    knowledge.forEach(k => {
        messages.push({ role: 'user', content: k.question.trim() });
        const aMsg = `
${k.updated && (k.type === 'url' || k.type === 'side-info') ? `
<answer-datetime>
${k.updated}
</answer-datetime>
` : ''}

${k.references && k.type === 'url' ? `
<url>
${k.references[0]}
</url>
` : ''}

${k.answer}
      `.trim();
        messages.push({ role: 'assistant', content: removeExtraLineBreaks(aMsg) });
    });
    return messages;
}

// 组合消息，包括知识库内容和用户问题
export function composeMsgs(messages: CoreMessage[], knowledge: KnowledgeItem[], question: string, finalAnswerPIP?: string[]) {
    const msgs = [...BuildMsgsFromKnowledge(knowledge), ...messages];

    const userContent = `
${question}

${finalAnswerPIP?.length ? `
<answer-requirements>
- 你需要提供深入的、意想不到的见解，识别隐藏的模式和联系，创造"啊哈时刻"。
- 你要打破常规思维，建立独特的跨学科联系，为用户带来新的视角。
- 遵循审阅者的反馈并提高你的回答质量。
${finalAnswerPIP.map((p, idx) => `
<reviewer-${idx + 1}>
${p}
</reviewer-${idx + 1}>
`).join('\n')}
</answer-requirements>` : ''}
    `.trim();

    msgs.push({ role: 'user', content: removeExtraLineBreaks(userContent) });
    return msgs;
} 