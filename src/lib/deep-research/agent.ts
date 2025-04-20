import { CoreMessage } from 'ai';
import { ZodObject } from 'zod';
import { SafeSearchType, search as duckSearch } from "duck-duck-scrape";
import { SEARCH_PROVIDER, STEP_SLEEP } from './config';
import { TokenTracker } from './utils/token-tracker';
import { ActionTracker } from './utils/action-tracker';
import { ObjectGeneratorSafe } from "./utils/safe-generator";
import { CodeSandbox } from "./tools/code-sandbox";
import { Schemas } from "./utils/schemas";
import { sleep, updateContext, includesEval } from './utils/common';
import {
    StepAction,
    AnswerAction,
    ReflectAction,
    SearchAction,
    VisitAction,
    CodingAction,
    KnowledgeItem,
    TrackerContext,
    SearchSnippet,
    BoostedSearchSnippet,
    WebContent,
    Reference,
    EvaluationResponse,
    UnNormalizedSearchSnippet
} from './types';
import {
    addToAllURLs,
    rankURLs,
    filterURLs,
    normalizeUrl,
    sortSelectURLs,
    getLastModified,
    keepKPerHostname,
    processURLs,
    fixBadURLMdLinks,
    extractUrlsWithDescription
} from "./utils/url-tools";
import {
    buildMdFromAnswer,
    chooseK,
    convertHtmlTablesToMd,
    fixCodeBlockIndentation,
    removeExtraLineBreaks,
    removeHTMLtags,
    repairMarkdownFinal,
    repairMarkdownFootnotesOuter
} from "./utils/text-tools";
import { formatDateBasedOnType, formatDateRange } from "./utils/date-tools";
import { repairUnknownChars } from "./tools/broken-ch-fixer";
import { reviseAnswer } from "./tools/md-fixer";
import { buildReferences } from "./tools/build-ref";
import { evaluateAnswer, evaluateQuestion } from './tools/evaluator';
import { analyzeSteps } from './tools/error-analyzer';
import { rewriteQuery } from './tools/query-rewriter';
import { dedupQueries } from './tools/jina-dedup';
import { MAX_QUERIES_PER_STEP, MAX_REFLECT_PER_STEP, MAX_URLS_PER_STEP } from './utils/schemas';
import { search } from "./tools/jina-search";
import { getPrompt } from './utils/prompt';
import { composeMsgs, BuildMsgsFromKnowledge } from './utils/message';
import { executeSearchQueries } from './actions/search';

// 存储所有上下文步骤
const allContext: StepAction[] = [];

// 更新参考文献
async function updateReferences(thisStep: AnswerAction, allURLs: Record<string, SearchSnippet>) {
    thisStep.references = thisStep.references
        ?.filter(ref => ref?.url)
        .map(ref => {
            const normalizedUrl = normalizeUrl(ref.url);
            if (!normalizedUrl) return null;

            return {
                ...ref,
                exactQuote: (ref?.exactQuote ||
                    allURLs[normalizedUrl]?.description ||
                    allURLs[normalizedUrl]?.title || '')
                    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                    .replace(/\s+/g, ' '),
                title: allURLs[normalizedUrl]?.title || '',
                url: normalizedUrl,
                dateTime: ref?.dateTime || allURLs[normalizedUrl]?.date || '',
            };
        })
        .filter(Boolean) as Reference[];

    await Promise.all((thisStep.references || []).filter(ref => !ref.dateTime)
        .map(async ref => {
            ref.dateTime = await getLastModified(ref.url) || '';
        }));

    console.log('更新的参考文献:', thisStep.references);
}

// 主要的响应获取函数
export async function getResponse(
    questionFromParam?: string,
    tokenBudget: number = 1_000_000,
    maxBadAttempts: number = 2,
    existingContext?: Partial<TrackerContext>,
    messages?: Array<CoreMessage>,
    numReturnedURLs: number = 100,
    noDirectAnswer: boolean = false,
    boostHostnames: string[] = [],
    badHostnames: string[] = [],
    onlyHostnames: string[] = [],
    maxRef: number = 10,
    minRelScore: number = 0.75
): Promise<{ result: StepAction; context: TrackerContext; visitedURLs: string[], readURLs: string[], allURLs: string[] }> {

    let step = 0;
    let totalStep = 0;

    // 确定实际问题
    let question: string = '';
    if (!question && questionFromParam) {
        question = questionFromParam.trim();
    }
    if (!messages || messages.length === 0) {
        if (!question) {
            throw new Error("Cannot determine the question. Provide either messages or a question string.");
        }
        messages = [{ role: 'user', content: question }];
    }

    const SchemaGen = new Schemas();
    await SchemaGen.setLanguage(question)
    const context: TrackerContext = {
        tokenTracker: existingContext?.tokenTracker || new TokenTracker(tokenBudget),
        actionTracker: existingContext?.actionTracker || new ActionTracker()
    };

    const generator = new ObjectGeneratorSafe(context.tokenTracker);

    let schema: ZodObject<any> = SchemaGen.getAgentSchema(true, true, true, true, true)
    const gaps: string[] = [question];
    const allQuestions = [question];
    const allKeywords: string[] = [];
    const allKnowledge: KnowledgeItem[] = [];

    let diaryContext: string[] = [];
    let weightedURLs: BoostedSearchSnippet[] = [];
    let allowAnswer = true;
    let allowSearch = true;
    let allowRead = true;
    let allowReflect = true;
    let allowCoding = false;
    let msgWithKnowledge: CoreMessage[] = [];
    let thisStep: StepAction = { action: 'answer', answer: '', references: [], think: '', isFinal: false };

    const allURLs: Record<string, SearchSnippet> = {};
    const allWebContents: Record<string, WebContent> = {};
    const visitedURLs: string[] = [];
    const badURLs: string[] = [];
    const evaluationMetrics: Record<string, any[]> = {};
    const regularBudget = tokenBudget * 0.85;
    const finalAnswerPIP: string[] = [];
    let trivialQuestion = false;

    messages.forEach(m => {
        let strMsg = '';
        if (typeof m.content === 'string') {
            strMsg = m.content.trim();
        } else if (typeof m.content === 'object' && Array.isArray(m.content)) {
            strMsg = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
        }

        extractUrlsWithDescription(strMsg).forEach(u => {
            addToAllURLs(u, allURLs);
        });
    })

    while (context.tokenTracker.getTotalUsage().totalTokens < regularBudget) {
        step++;
        totalStep++;
        const budgetPercentage = (context.tokenTracker.getTotalUsage().totalTokens / tokenBudget * 100).toFixed(2);
        console.log(`Step ${totalStep} / Budget used ${budgetPercentage}%`);
        console.log('Gaps:', gaps);
        allowReflect = allowReflect && (gaps.length <= MAX_REFLECT_PER_STEP);
        const currentQuestion: string = gaps[totalStep % gaps.length];

        if (currentQuestion.trim() === question && totalStep === 1) {
            evaluationMetrics[currentQuestion] = (await evaluateQuestion(currentQuestion, context, SchemaGen)).map(e => ({
                type: e,
                numEvalsRequired: maxBadAttempts
            }));
            evaluationMetrics[currentQuestion].push({ type: 'strict', numEvalsRequired: maxBadAttempts });
        } else if (currentQuestion.trim() !== question && !evaluationMetrics[currentQuestion]) {
            evaluationMetrics[currentQuestion] = []
        }

        if (totalStep === 1 && evaluationMetrics[currentQuestion]?.some(e => e.type === 'freshness')) {
            allowAnswer = false;
            allowReflect = false;
        }

        if (allURLs && Object.keys(allURLs).length > 0) {
            weightedURLs = rankURLs(
                filterURLs(allURLs, visitedURLs, badHostnames, onlyHostnames),
                {
                    question: currentQuestion,
                    boostHostnames
                }, context);
            weightedURLs = keepKPerHostname(weightedURLs, 2);
            console.log('Weighted URLs:', weightedURLs.length);
        }
        allowRead = allowRead && (weightedURLs.length > 0);

        allowSearch = allowSearch && (weightedURLs.length < 50);

        const { system, urlList } = getPrompt(
            diaryContext,
            allQuestions,
            allKeywords,
            allowReflect,
            allowAnswer,
            allowRead,
            allowSearch,
            allowCoding,
            allKnowledge,
            weightedURLs,
            false,
        );
        schema = SchemaGen.getAgentSchema(allowReflect, allowRead, allowAnswer, allowSearch, allowCoding, currentQuestion)
        msgWithKnowledge = composeMsgs(messages, allKnowledge, currentQuestion, currentQuestion === question ? finalAnswerPIP : undefined);
        const result = await generator.generateObject({
            model: 'agent',
            schema,
            system,
            messages: msgWithKnowledge,
            numRetries: 2,
        });
        thisStep = {
            action: result.object.action,
            think: result.object.think,
            ...(result.object[result.object.action] ? result.object[result.object.action] : {})
        } as StepAction;

        const actionsStr = [allowSearch && 'search', allowRead && 'visit', allowAnswer && 'answer', allowReflect && 'reflect', allowCoding && 'coding'].filter(Boolean).join(', ');
        console.log(`${currentQuestion}: ${thisStep.action} <- [${actionsStr}]`);
        console.log(thisStep)

        context.actionTracker.trackAction({ totalStep, thisStep, gaps });

        allowAnswer = true;
        allowReflect = true;
        allowRead = true;
        allowSearch = true;
        allowCoding = true;

        if (thisStep.action === 'answer' && (thisStep as AnswerAction).answer) {
            const currentAnswerAction = thisStep as AnswerAction;

            if (totalStep === 1 && !noDirectAnswer) {
                currentAnswerAction.isFinal = true;
                trivialQuestion = true;
                break
            }

            updateContext({
                totalStep,
                question: currentQuestion,
                ...currentAnswerAction,
            });

            console.log(currentQuestion, evaluationMetrics[currentQuestion])
            let evaluation: EvaluationResponse = {
                pass: true,
                think: '',
                type: 'strict',
                improvement_plan: ''
            };
            const currentEvalMetrics = evaluationMetrics[currentQuestion];
            if (currentEvalMetrics && currentEvalMetrics.length > 0) {
                context.actionTracker.trackThink('eval_first', SchemaGen.languageCode)
                evaluation = await evaluateAnswer(
                    currentQuestion,
                    currentAnswerAction,
                    currentEvalMetrics.filter(e => e.numEvalsRequired > 0).map(e => e.type),
                    context,
                    allKnowledge,
                    SchemaGen
                ) || evaluation;
            }

            if (currentQuestion.trim() === question) {
                allowCoding = false;

                if (evaluation.pass) {
                    diaryContext.push(`
At step ${step}, you took **answer** action and finally found the answer to the original question:

Original question: 
${currentQuestion}

Your answer: 
${currentAnswerAction.answer}

The evaluator thinks your answer is good because: 
${evaluation.think}

Your journey ends here. You have successfully answered the original question. Congratulations! 🎉
`);
                    currentAnswerAction.isFinal = true;
                    break
                } else {
                    if (currentEvalMetrics) {
                        evaluationMetrics[currentQuestion] = currentEvalMetrics.map(e => {
                            if (e.type === evaluation.type) {
                                e.numEvalsRequired--;
                            }
                            return e;
                        }).filter(e => e.numEvalsRequired > 0);
                    }

                    if (evaluation.type === 'strict' && evaluation.improvement_plan) {
                        finalAnswerPIP.push(evaluation.improvement_plan);
                    }

                    if (!evaluationMetrics[currentQuestion] || evaluationMetrics[currentQuestion].length === 0) {
                        currentAnswerAction.isFinal = false;
                        break
                    }

                    diaryContext.push(`
At step ${step}, you took **answer** action but evaluator thinks it is not a good answer:

Original question: 
${currentQuestion}

Your answer: 
${currentAnswerAction.answer}

The evaluator thinks your answer is bad because: 
${evaluation.think}
`);
                    const errorAnalysis = await analyzeSteps(diaryContext, context, SchemaGen);

                    allKnowledge.push({
                        question: `
Why is the following answer bad for the question? Please reflect

<question>
${currentQuestion}
</question>

<answer>
${currentAnswerAction.answer}
</answer>
`,
                        answer: `
${evaluation.think}

${errorAnalysis.recap}

${errorAnalysis.blame}

${errorAnalysis.improvement}
`,
                        type: 'qa',
                    })

                    allowAnswer = false;
                    diaryContext = [];
                    step = 0;
                }
            } else if (evaluation.pass) {
                diaryContext.push(`
At step ${step}, you took **answer** action. You found a good answer to the sub-question:

Sub-question: 
${currentQuestion}

Your answer: 
${currentAnswerAction.answer}

The evaluator thinks your answer is good because: 
${evaluation.think}

Although you solved a sub-question, you still need to find the answer to the original question. You need to keep going.
`);
                allKnowledge.push({
                    question: currentQuestion,
                    answer: currentAnswerAction.answer,
                    type: 'qa',
                    updated: formatDateBasedOnType(new Date(), 'full')
                });
                gaps.splice(gaps.indexOf(currentQuestion), 1);
            }
        } else if (thisStep.action === 'reflect' && (thisStep as ReflectAction).questionsToAnswer) {
            const currentReflectAction = thisStep as ReflectAction;
            currentReflectAction.questionsToAnswer = chooseK((await dedupQueries(currentReflectAction.questionsToAnswer, allQuestions, context.tokenTracker)).unique_queries, MAX_REFLECT_PER_STEP);
            const newGapQuestions = currentReflectAction.questionsToAnswer
            if (newGapQuestions.length > 0) {
                diaryContext.push(`
At step ${step}, you took **reflect** and think about the knowledge gaps. You found some sub-questions are important to the question: "${currentQuestion}"
You realize you need to know the answers to the following sub-questions:
${newGapQuestions.map((q: string) => `- ${q}`).join('\n')}

You will now figure out the answers to these sub-questions and see if they can help you find the answer to the original question.
`);
                gaps.push(...newGapQuestions);
                allQuestions.push(...newGapQuestions);
                updateContext({
                    totalStep,
                    ...currentReflectAction,
                });
            } else {
                diaryContext.push(`
At step ${step}, you took **reflect** and think about the knowledge gaps. You tried to break down the question "${currentQuestion}" into gap-questions like this: ${newGapQuestions.join(', ')} 
But then you realized you have asked them before. You decided to to think out of the box or cut from a completely different angle. 
`);
                updateContext({
                    totalStep,
                    ...currentReflectAction,
                    result: 'You have tried all possible questions and found no useful information. You must think out of the box or different angle!!!'
                });
            }
            allowReflect = false;
        } else if (thisStep.action === 'search' && (thisStep as SearchAction).searchRequests) {
            const currentSearchAction = thisStep as SearchAction;
            currentSearchAction.searchRequests = chooseK((await dedupQueries(currentSearchAction.searchRequests, [], context.tokenTracker)).unique_queries, MAX_QUERIES_PER_STEP);

            const { searchedQueries: initialSearchedQueries, newKnowledge: initialNewKnowledge } = await executeSearchQueries(
                currentSearchAction.searchRequests.map((q: string) => ({ q })),
                context,
                allURLs,
                SchemaGen,
                allWebContents
            );

            allKeywords.push(...initialSearchedQueries);
            allKnowledge.push(...initialNewKnowledge);

            const soundBites = initialNewKnowledge.map(k => k.answer).join(' ');

            let keywordsQueries = await rewriteQuery(currentSearchAction, soundBites, context, SchemaGen);
            const qOnly = keywordsQueries.filter(q => q.q).map(q => q.q)
            const uniqQOnly = chooseK((await dedupQueries(qOnly, allKeywords, context.tokenTracker)).unique_queries, MAX_QUERIES_PER_STEP);
            keywordsQueries = uniqQOnly.map(q => {
                const matches = keywordsQueries.filter(kq => kq.q === q);
                return matches.length > 1 ? { q } : matches[0];
            });

            let anyResult = false;

            if (keywordsQueries.length > 0) {
                const { searchedQueries, newKnowledge } = await executeSearchQueries(
                    keywordsQueries,
                    context,
                    allURLs,
                    SchemaGen,
                    allWebContents,
                    onlyHostnames
                );

                if (searchedQueries.length > 0) {
                    anyResult = true;
                    allKeywords.push(...searchedQueries);
                    allKnowledge.push(...newKnowledge);

                    diaryContext.push(`
At step ${step}, you took the **search** action and look for external information for the question: "${currentQuestion}".
In particular, you tried to search for the following keywords: "${keywordsQueries.map(q => q.q).join(', ')}".
You found quite some information and add them to your URL list and **visit** them later when needed. 
`);

                    updateContext({
                        totalStep,
                        question: currentQuestion,
                        ...currentSearchAction,
                        result: { searchedQueries, newKnowledge }
                    });
                }
            }
            if (!anyResult) {
                diaryContext.push(`
At step ${step}, you took the **search** action and look for external information for the question: "${currentQuestion}".
In particular, you tried to search for the following keywords:  "${keywordsQueries.map(q => q.q).join(', ')}".
But then you realized you have already searched for these keywords before, or the rewritten queries yielded no results. No new information is returned.
You decided to think out of the box or cut from a completely different angle.
`);

                updateContext({
                    totalStep,
                    ...currentSearchAction,
                    result: 'You have tried all possible queries and found no new information. You must think out of the box or different angle!!!'
                });
            }
            allowSearch = false;
            allowAnswer = false;
        } else if (thisStep.action === 'visit' && (thisStep as VisitAction).URLTargets?.length && urlList?.length) {
            const currentVisitAction = thisStep as VisitAction;

            currentVisitAction.URLTargets = (currentVisitAction.URLTargets as number[])
                .map(idx => normalizeUrl(urlList[idx - 1]))
                .filter(url => url && !visitedURLs.includes(url)) as string[];

            const combinedTargets = [...new Set([...currentVisitAction.URLTargets, ...weightedURLs.slice(0, MAX_URLS_PER_STEP).map(r => r.url!)])];
            currentVisitAction.URLTargets = combinedTargets.slice(0, MAX_URLS_PER_STEP);

            const uniqueURLs = currentVisitAction.URLTargets;
            console.log("Visiting URLs:", uniqueURLs);

            if (uniqueURLs.length > 0) {
                const { urlResults, success } = await processURLs(
                    uniqueURLs,
                    context,
                    allKnowledge,
                    allURLs,
                    visitedURLs,
                    badURLs,
                    SchemaGen,
                    currentQuestion,
                    allWebContents
                );

                diaryContext.push(success
                    ? `At step ${step}, you took the **visit** action and deep dive into the following URLs:
${urlResults.map(r => r?.url).join('\n')}
You found some useful information on the web and add them to your knowledge for future reference.`
                    : `At step ${step}, you took the **visit** action and try to visit some URLs but failed to read the content. You need to think out of the box or cut from a completely different angle.`
                );

                updateContext({
                    totalStep,
                    ...(success ? {
                        question: currentQuestion,
                        ...currentVisitAction,
                        result: urlResults
                    } : {
                        ...currentVisitAction,
                        result: 'You have tried all possible URLs and found no new information. You must think out of the box or different angle!!!'
                    })
                });
            } else {
                diaryContext.push(`
At step ${step}, you took the **visit** action. But then you realized you have already visited these URLs or there were no relevant URLs to visit.
You decided to think out of the box or cut from a completely different angle.`);

                updateContext({
                    totalStep,
                    ...currentVisitAction,
                    result: 'You have visited all possible URLs or found no relevant ones. You must think out of the box or different angle!!!'
                });
            }
            allowRead = false;
        } else if (thisStep.action === 'coding' && (thisStep as CodingAction).codingIssue) {
            const currentCodingAction = thisStep as CodingAction;
            const sandbox = new CodeSandbox({ allContext, URLs: weightedURLs.slice(0, 20), allKnowledge }, context, SchemaGen);
            try {
                const result = await sandbox.solve(currentCodingAction.codingIssue);
                allKnowledge.push({
                    question: `What is the solution to the coding issue: ${currentCodingAction.codingIssue}?`,
                    answer: result.solution.output,
                    sourceCode: result.solution.code,
                    type: 'coding',
                    updated: formatDateBasedOnType(new Date(), 'full')
                });
                diaryContext.push(`
At step ${step}, you took the **coding** action and try to solve the coding issue: ${currentCodingAction.codingIssue}.
You found the solution and add it to your knowledge for future reference.
`);
                updateContext({
                    totalStep,
                    ...currentCodingAction,
                    result: result
                });
            } catch (error) {
                console.error('Error solving coding issue:', error);
                diaryContext.push(`
At step ${step}, you took the **coding** action and try to solve the coding issue: ${currentCodingAction.codingIssue}.
But unfortunately, you failed to solve the issue. You need to think out of the box or cut from a completely different angle.
`);
                updateContext({
                    totalStep,
                    ...currentCodingAction,
                    result: 'You have tried all possible solutions and found no new information. You must think out of the box or different angle!!!'
                });
            } finally {
                allowCoding = false;
            }
        }

        await sleep(STEP_SLEEP);
    }

    if (!(thisStep as AnswerAction).isFinal) {
        console.log('Entering Beast mode!!!')
        step++;
        totalStep++;
        const { system } = getPrompt(
            diaryContext,
            allQuestions,
            allKeywords,
            false,
            false,
            false,
            false,
            false,
            allKnowledge,
            weightedURLs,
            true,
        );

        schema = SchemaGen.getAgentSchema(false, false, true, false, false, question);
        msgWithKnowledge = composeMsgs(messages, allKnowledge, question, finalAnswerPIP);
        const result = await generator.generateObject({
            model: 'agentBeastMode',
            schema,
            system,
            messages: msgWithKnowledge,
            numRetries: 2
        });
        thisStep = {
            action: result.object.action,
            think: result.object.think,
            ...(result.object[result.object.action] ? result.object[result.object.action] : {})
        } as AnswerAction;
        (thisStep as AnswerAction).isFinal = true;
        context.actionTracker.trackAction({ totalStep, thisStep, gaps });
    }

    const answerStep = thisStep as AnswerAction;

    if (!trivialQuestion) {
        answerStep.answer = answerStep.answer || "I couldn't find a definitive answer, but here's what I gathered.";

        answerStep.answer = repairMarkdownFinal(
            convertHtmlTablesToMd(
                fixBadURLMdLinks(
                    fixCodeBlockIndentation(
                        repairMarkdownFootnotesOuter(
                            await repairUnknownChars(
                                await reviseAnswer(
                                    answerStep.answer,
                                    allKnowledge,
                                    context,
                                    SchemaGen),
                                context))
                    ),
                    allURLs)));

        try {
            const { answer, references } = await buildReferences(
                answerStep.answer,
                allWebContents,
                context,
                SchemaGen,
                80,
                maxRef,
                minRelScore
            );
            answerStep.answer = answer;
            answerStep.references = references;
            await updateReferences(answerStep, allURLs)
            answerStep.mdAnswer = repairMarkdownFootnotesOuter(buildMdFromAnswer(answerStep));
        } catch (refError) {
            console.error("Error building or updating references:", refError);
            answerStep.references = answerStep.references || [];
            answerStep.mdAnswer = repairMarkdownFootnotesOuter(buildMdFromAnswer(answerStep));
        }
    } else {
        answerStep.mdAnswer = answerStep.mdAnswer || convertHtmlTablesToMd(
            fixCodeBlockIndentation(
                buildMdFromAnswer(answerStep))
        );
    }

    console.log(thisStep)

    const returnedURLs = weightedURLs.slice(0, numReturnedURLs).map(r => r.url);
    return {
        result: thisStep,
        context,
        visitedURLs: returnedURLs,
        readURLs: visitedURLs.filter(url => !badURLs.includes(url)),
        allURLs: weightedURLs.map(r => r.url)
    };
}
