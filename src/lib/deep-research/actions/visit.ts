import {
    VisitAction, KnowledgeItem, TrackerContext, SearchSnippet, WebContent, BoostedSearchSnippet
} from '../types';
import { normalizeUrl, processURLs } from "../utils/url-tools";
import { MAX_URLS_PER_STEP, Schemas } from '../utils/schemas';
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';

export async function handleVisitAction(thisAgent: ResearchAgent, action: VisitAction): Promise<void> {
    console.log("Handling Visit Action");

    const weightedURLs = thisAgent.weightedURLs as BoostedSearchSnippet[];
    const visitedURLs = thisAgent.visitedURLs as string[];
    const context = thisAgent.context as TrackerContext;
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const allURLs = thisAgent.allURLs as Record<string, SearchSnippet>;
    const badURLs = thisAgent.badURLs as string[];
    const SchemaGen = thisAgent.SchemaGen as Schemas;
    const gaps = thisAgent.gaps as string[];
    const totalStep = thisAgent.totalStep as number;
    const question = thisAgent.question as string;
    const allWebContents = thisAgent.allWebContents as Record<string, WebContent>;
    const diaryContext = thisAgent.diaryContext as string[];
    const step = thisAgent.step as number;

    // 1. Normalize URLs from action.URLTargets and weightedURLs
    const urlListForAction = (weightedURLs || []).map(r => r.url);
    const initialTargets = (action.URLTargets as (number | string)[])
        .map(target => {
            if (typeof target === 'number' && target > 0 && target <= urlListForAction.length) {
                return normalizeUrl(urlListForAction[target - 1]);
            } else if (typeof target === 'string') {
                return normalizeUrl(target);
            }
            return null;
        })
        .filter(url => url && !visitedURLs.includes(url)) as string[];

    const combinedTargets = [...new Set([...initialTargets, ...weightedURLs.slice(0, MAX_URLS_PER_STEP).map(r => r.url!)])];
    const uniqueURLs = combinedTargets.filter(url => !visitedURLs.includes(url)).slice(0, MAX_URLS_PER_STEP);

    console.log("Visiting URLs:", uniqueURLs);

    // 2. Process URLs (if any)
    if (uniqueURLs.length > 0) {
        const { urlResults, success } = await processURLs(
            uniqueURLs,
            context,
            allKnowledge,
            allURLs,
            visitedURLs, // Pass visitedURLs to be updated by processURLs
            badURLs,     // Pass badURLs to be updated by processURLs
            SchemaGen,
            gaps[totalStep % gaps.length] || question, // Pass current question
            allWebContents // Pass web contents map to be updated
        );

        // 3. Update diary context
        diaryContext.push(success
            ? `At step ${step}, you took the **visit** action and deep dive into the following URLs:\n${urlResults.map(r => r?.url).join('\n')}\nYou found some useful information on the web and add them to your knowledge for future reference.`
            : `At step ${step}, you took the **visit** action and try to visit some URLs but failed to read the content. You need to think out of the box or cut from a completely different angle.`
        );

        // 4. Update context (call updateContextHelper)
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...(success ? {
                question: gaps[totalStep % gaps.length] || question,
                ...action,
                URLTargets: uniqueURLs,
                result: urlResults
            } : {
                ...action,
                URLTargets: uniqueURLs,
                result: 'You have tried all possible URLs and found no new information. You must think out of the box or different angle!!!'
            })
        });

    } else {
        diaryContext.push(`
At step ${step}, you took the **visit** action. But then you realized you have already visited these URLs or there were no relevant URLs to visit.
You decided to think out of the box or cut from a completely different angle.`);

        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            URLTargets: [],
            result: 'You have visited all possible URLs or found no relevant ones. You must think out of the box or different angle!!!'
        });
    }

    // 5. Update agent state (modified in the caller)
    (thisAgent as any).allowRead = false;
}
