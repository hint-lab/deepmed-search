import { LanguageModelUsage } from "ai";
import { EventEmitter } from "events";
import { StepAction } from "@/lib/deep-research/types";

export interface BaseTokenTracker {
    hasRemainingTokens(): boolean;
    getRemainingTokens(): number;
    getTotalUsage(): LanguageModelUsage;
    addUsage(usage: LanguageModelUsage): void;
    usages: LanguageModelUsage[];
    trackUsage(usage: LanguageModelUsage): void;
    getTotalUsageSnakeCase(): {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    getUsageBreakdown(): {
        byModel: Record<string, LanguageModelUsage>;
        byStep: Record<number, LanguageModelUsage>;
    };
    printSummary(): void;
    reset(): void;
}

export interface BaseActionTracker {
    getContext(): string;
    getStepContext(): string;
    trackAction(action: {
        totalStep: number;
        thisStep: StepAction;
        gaps: string[];
    }): void;
    state: {
        currentStep: number;
        lastAction?: StepAction;
        history: StepAction[];
    };
    trackThink(thought: string): void;
    getState(): {
        currentStep: number;
        lastAction?: StepAction;
        history: StepAction[];
    };
    reset(): void;
}

export interface TokenTracker extends BaseTokenTracker, EventEmitter {
    usages: LanguageModelUsage[];
}

export interface ActionTracker extends BaseActionTracker, EventEmitter { }

export interface TrackerContext {
    tokenTracker: TokenTracker;
    actionTracker: ActionTracker;
}

export interface ResearchOptions {
    noDirectAnswer?: boolean;
    maxBadAttempts?: number;
    onlyHostnames?: string[];
    STEP_SLEEP?: number;
}

export interface ResearchResult {
    answer: string;
    references: string[];
    usage: LanguageModelUsage;
    steps: StepAction[];
} 