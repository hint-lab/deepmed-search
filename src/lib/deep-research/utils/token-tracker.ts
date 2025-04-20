import { EventEmitter } from 'events';

import { TokenUsage } from '../types';
import { LanguageModelUsage } from "ai";
import { storeTokenTrackerState } from '../tracker-store';

export class TokenTracker extends EventEmitter {
  private taskId: string;
  private usages: TokenUsage[] = [];
  private budget?: number;

  constructor(taskId: string, budget?: number) {
    super();
    if (!taskId) {
      throw new Error("[TokenTracker] taskId is required");
    }
    this.taskId = taskId;
    this.budget = budget;
    console.log(`[TokenTracker CONSTRUCTOR] Initialized for taskId: ${this.taskId}`);

    if ('asyncLocalContext' in process) {
      const asyncLocalContext = process.asyncLocalContext as any;
      this.on('usage', () => {
        if (asyncLocalContext.available()) {
          asyncLocalContext.ctx.chargeAmount = this.getTotalUsage().totalTokens;
        }
      });

    }
  }

  trackUsage(tool: string, usage: LanguageModelUsage) {
    const u = { tool, usage };
    this.usages.push(u);
    this.emit('usage', usage);

    this.persistState().catch(err => {
      console.error(`[TokenTracker ${this.taskId}] Error persisting state:`, err);
    });
  }

  private async persistState(): Promise<void> {
    console.log(`[TokenTracker PERSIST] Persisting state for taskId: ${this.taskId}`);
    if (!this.taskId) {
      console.error(`[TokenTracker PERSIST] CRITICAL: Attempting to persist state with undefined taskId!`);
      return;
    }
    await storeTokenTrackerState(this.taskId, { usages: this.usages, budget: this.budget });
  }

  getTotalUsage(): LanguageModelUsage {
    return this.usages.reduce((acc, { usage }) => {
      acc.promptTokens += usage.promptTokens;
      acc.completionTokens += usage.completionTokens;
      acc.totalTokens += usage.totalTokens;
      return acc;
    }, { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  }

  getTotalUsageSnakeCase(): { prompt_tokens: number, completion_tokens: number, total_tokens: number } {
    return this.usages.reduce((acc, { usage }) => {
      acc.prompt_tokens += usage.promptTokens;
      acc.completion_tokens += usage.completionTokens;
      acc.total_tokens += usage.totalTokens;
      return acc;
    }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
  }

  getUsageBreakdown(): Record<string, number> {
    return this.usages.reduce((acc, { tool, usage }) => {
      acc[tool] = (acc[tool] || 0) + usage.totalTokens;
      return acc;
    }, {} as Record<string, number>);
  }


  printSummary() {
    const breakdown = this.getUsageBreakdown();
    console.log('Token Usage Summary:', {
      budget: this.budget,
      total: this.getTotalUsage(),
      breakdown
    });
  }

  reset() {
    this.usages = [];
    this.persistState().catch(err => {
      console.error(`[TokenTracker ${this.taskId}] Error persisting reset state:`, err);
    });
  }
}
