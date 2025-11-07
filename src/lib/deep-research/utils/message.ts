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
    // 限制知识数量以避免上下文过大
    // 优先选择：qa 类型的知识（更相关）和最新的知识
    const MAX_KNOWLEDGE_ITEMS = 15; // 限制最多15条知识，约30条消息
    
    let selectedKnowledge = knowledge;
    if (knowledge.length > MAX_KNOWLEDGE_ITEMS) {
        console.log(`Knowledge count (${knowledge.length}) exceeds limit. Selecting top ${MAX_KNOWLEDGE_ITEMS} items.`);
        
        // 优先级排序：qa > url > side-info
        const priorityMap: Record<string, number> = { 'qa': 3, 'url': 2, 'side-info': 1 };
        selectedKnowledge = knowledge
            .map((k, idx) => ({ k, priority: priorityMap[k.type] || 0, idx }))
            .sort((a, b) => {
                // 先按优先级排序，再按索引（保持原有顺序）
                if (b.priority !== a.priority) return b.priority - a.priority;
                return a.idx - b.idx;
            })
            .slice(0, MAX_KNOWLEDGE_ITEMS)
            .map(item => item.k);
        
        console.log(`Selected knowledge types:`, selectedKnowledge.map(k => k.type));
    }
    
    const msgs = [...BuildMsgsFromKnowledge(selectedKnowledge), ...messages];

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