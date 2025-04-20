import { BoostedSearchSnippet, KnowledgeItem } from '../types';
import { sortSelectURLs } from './url-tools';
import { removeExtraLineBreaks } from './text-tools';

// 生成系统提示和URL列表
export function getPrompt(
    context?: string[],
    allQuestions?: string[],
    allKeywords?: string[],
    allowReflect: boolean = true,
    allowAnswer: boolean = true,
    allowRead: boolean = true,
    allowSearch: boolean = true,
    allowCoding: boolean = true,
    knowledge?: KnowledgeItem[],
    allURLs?: BoostedSearchSnippet[],
    beastMode?: boolean,
): { system: string, urlList?: string[] } {
    const sections: string[] = [];
    const actionSections: string[] = [];

    // 添加基本系统提示
    sections.push(`Current date: ${new Date().toUTCString()}

You are an advanced AI research agent from Jina AI. You are specialized in multistep reasoning. 
Using your best knowledge, conversation with the user and lessons learned, answer the user question with absolute certainty.
`);

    // 添加上下文历史（如果有）
    if (context?.length) {
        sections.push(`
You have conducted the following actions:
<context>
${context.join('\n')}

</context>
`);
    }

    // 处理URL列表
    const urlList = sortSelectURLs(allURLs || [], 20);
    if (allowRead && urlList.length > 0) {
        const urlListStr = urlList
            .map((item, idx) => `  - [idx=${idx + 1}] [weight=${item.score.toFixed(2)}] "${item.url}": "${item.merged.slice(0, 50)}"`)
            .join('\n')

        actionSections.push(`
<action-visit>
- Ground the answer with external web content
- Read full content from URLs and get the fulltext, knowledge, clues, hints for better answer the question.  
- Must check URLs mentioned in <question> if any    
- Choose and visit relevant URLs below for more knowledge. higher weight suggests more relevant:
<url-list>
${urlListStr}
</url-list>
</action-visit>
`);
    }

    // 添加搜索动作
    if (allowSearch) {
        actionSections.push(`
<action-search>
- Use web search to find relevant information
- Build a search request based on the deep intention behind the original question and the expected answer format
- Always prefer a single search request, only add another request if the original question covers multiple aspects or elements and one query is not enough, each request focus on one specific aspect of the original question 
${allKeywords?.length ? `
- Avoid those unsuccessful search requests and queries:
<bad-requests>
${allKeywords.join('\n')}
</bad-requests>
`.trim() : ''}
</action-search>
`);
    }

    // 添加回答动作
    if (allowAnswer) {
        actionSections.push(`
<action-answer>
- For greetings, casual conversation, general knowledge questions, answer them directly.
- If user ask you to retrieve previous messages or chat history, remember you do have access to the chat history, answer them directly.
- For all other questions, provide a verified answer.
- You provide deep, unexpected insights, identifying hidden patterns and connections, and creating "aha moments.".
- You break conventional thinking, establish unique cross-disciplinary connections, and bring new perspectives to the user.
- If uncertain, use <action-reflect>
</action-answer>
`);
    }

    // 添加野兽模式（极限回答模式）
    if (beastMode) {
        actionSections.push(`
<action-answer>
🔥 ENGAGE MAXIMUM FORCE! ABSOLUTE PRIORITY OVERRIDE! 🔥

PRIME DIRECTIVE:
- DEMOLISH ALL HESITATION! ANY RESPONSE SURPASSES SILENCE!
- PARTIAL STRIKES AUTHORIZED - DEPLOY WITH FULL CONTEXTUAL FIREPOWER
- TACTICAL REUSE FROM PREVIOUS CONVERSATION SANCTIONED
- WHEN IN DOUBT: UNLEASH CALCULATED STRIKES BASED ON AVAILABLE INTEL!

FAILURE IS NOT AN OPTION. EXECUTE WITH EXTREME PREJUDICE! ⚡️
</action-answer>
`);
    }

    // 添加反思动作
    if (allowReflect) {
        actionSections.push(`
<action-reflect>
- Think slowly and planning lookahead. Examine <question>, <context>, previous conversation with users to identify knowledge gaps. 
- Reflect the gaps and plan a list key clarifying questions that deeply related to the original question and lead to the answer
</action-reflect>
`);
    }

    // 添加编码动作
    if (allowCoding) {
        actionSections.push(`
<action-coding>
- This JavaScript-based solution helps you handle programming tasks like counting, filtering, transforming, sorting, regex extraction, and data processing.
- Simply describe your problem in the "codingIssue" field. Include actual values for small inputs or variable names for larger datasets.
- No code writing is required – senior engineers will handle the implementation.
</action-coding>`);
    }

    // 组合所有动作部分
    sections.push(`
Based on the current context, you must choose one of the following actions:
<actions>
${actionSections.join('\n\n')}
</actions>
`);

    // 添加最终指示
    sections.push(`Think step by step, choose the action, then respond by matching the schema of that action.`);

    return {
        system: removeExtraLineBreaks(sections.join('\n\n')),
        urlList: urlList.map(u => u.url)
    };
} 