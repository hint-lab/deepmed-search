import { CoreMessage } from 'ai';
import { TokenTracker } from '../utils/token-tracker';
import { ActionTracker } from '../utils/action-tracker';

// 基础类型定义
export interface KnowledgeItem {
    question: string;
    answer: string;
    type: string;
    updated?: string;
    sourceCode?: string;
    references?: Reference[];
}

export interface Reference {
    url: string;
    title?: string;
    exactQuote?: string;
    dateTime?: string;
}

export interface SearchSnippet {
    title: string;
    url: string;
    description: string;
    weight: number;
    date?: string;
}

export interface BoostedSearchSnippet extends SearchSnippet {
    score: number;
    merged: string;
}

export interface WebContent {
    title: string;
    full: string;
    chunks: string[];
    chunk_positions: number[][];
}

export interface SERPQuery {
    q: string;
    tbs?: string;
}

// 动作类型定义
export interface StepAction {
    action: string;
    think: string;
    isFinal?: boolean;
}

export interface AnswerAction extends StepAction {
    answer: string;
    references?: Reference[];
    mdAnswer?: string;
}

export interface ReflectAction extends StepAction {
    questionsToAnswer: string[];
    result?: string;
}

export interface SearchAction extends StepAction {
    searchRequests: string[];
    result?: any;
}

export interface VisitAction extends StepAction {
    URLTargets: (string | number)[];
    result?: any;
}

export interface CodingAction extends StepAction {
    codingIssue: string;
    result?: any;
}

// 评估类型定义
export type EvaluationType = 'freshness' | 'strict' | string;

export interface RepeatEvaluationType {
    type: EvaluationType;
    numEvalsRequired: number;
}

export interface EvaluationResponse {
    pass: boolean;
    think: string;
    type?: string;
    improvement_plan?: string;
}

// 上下文类型定义
export interface TrackerContext {
    tokenTracker: TokenTracker;
    actionTracker: ActionTracker;
} 