import {
    CodingAction, KnowledgeItem, TrackerContext, BoostedSearchSnippet
} from '../types';
import { CodeSandbox } from "../tools/code-sandbox";
import { Schemas } from "../utils/schemas";
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { formatDateBasedOnType } from "../utils/date-tools";

// Define `allContext` - This needs proper handling, maybe pass from agent?
// const allContext: StepAction[] = []; 

export async function handleCodingAction(thisAgent: ResearchAgent, action: CodingAction): Promise<void> {
    console.log("Handling Coding Action for:", action.codingIssue);

    const weightedURLs = thisAgent.weightedURLs as BoostedSearchSnippet[];
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const context = thisAgent.context as TrackerContext;
    const SchemaGen = thisAgent.SchemaGen as Schemas;
    const diaryContext = thisAgent.diaryContext as string[];
    const step = thisAgent.step as number;
    const totalStep = thisAgent.totalStep as number;
    const allContext = thisAgent.allContext; // Get allContext from agent instance

    // Pass necessary context/state to CodeSandbox constructor
    const sandbox = new CodeSandbox({ allContext: allContext, URLs: weightedURLs.slice(0, 20), allKnowledge: allKnowledge }, context, SchemaGen);

    try {
        const result = await sandbox.solve(action.codingIssue);
        // Add successful coding result to knowledge
        allKnowledge.push({
            question: `What is the solution to the coding issue: ${action.codingIssue}?`,
            answer: result.solution.output,
            sourceCode: result.solution.code,
            type: 'coding',
            updated: formatDateBasedOnType(new Date(), 'full')
        });
        // Update diary context for success
        diaryContext.push(`
At step ${step}, you took the **coding** action and try to solve the coding issue: ${action.codingIssue}.
You found the solution and add it to your knowledge for future reference.
`);
        // Update context for success
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            result: result // Store the sandbox result
        });
    } catch (error) {
        console.error('Error solving coding issue:', error);
        // Update diary context for failure
        diaryContext.push(`
At step ${step}, you took the **coding** action and try to solve the coding issue: ${action.codingIssue}.
But unfortunately, you failed to solve the issue. You need to think out of the box or cut from a completely different angle.
`);
        // Update context for failure
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            result: `Failed to solve coding issue: ${error instanceof Error ? error.message : String(error)}`
        });
    } finally {
        // Update agent state regardless of success/failure (modified in the caller)
        (thisAgent as any).allowCoding = false;
    }
}
