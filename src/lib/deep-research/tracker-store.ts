import { getRedisClient } from '../redis-client';

const TASK_ACTIVE_PREFIX = 'task:';
const TASK_ACTIVE_SUFFIX = ':active';
const TRACKER_CHANNEL_PREFIX = 'tracker:';

// Default TTL for the task active flag (e.g., 1 hour)
const DEFAULT_TASK_TTL_SECONDS = 60 * 60;

/**
 * Stores a placeholder in Redis to indicate a task is active.
 * @param taskId The unique ID of the task.
 * @param ttlSeconds Time-to-live in seconds for the placeholder.
 */
export async function storeTaskPlaceholder(taskId: string, ttlSeconds: number = DEFAULT_TASK_TTL_SECONDS): Promise<void> {
    const redis = getRedisClient();
    const key = `${TASK_ACTIVE_PREFIX}${taskId}${TASK_ACTIVE_SUFFIX}`;
    try {
        // Set the key with a value (e.g., '1') and an expiration time (EX)
        await redis.set(key, '1', 'EX', ttlSeconds);
        console.log(`[TrackerStore] Stored active placeholder for task ${taskId} with TTL ${ttlSeconds}s`);
    } catch (error) {
        console.error(`[TrackerStore] Error storing placeholder for task ${taskId}:`, error);
        // Depending on requirements, you might want to re-throw the error
    }
}

/**
 * Checks if a task is marked as active in Redis.
 * @param taskId The unique ID of the task.
 * @returns True if the task placeholder exists, false otherwise.
 */
export async function checkTaskActive(taskId: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = `${TASK_ACTIVE_PREFIX}${taskId}${TASK_ACTIVE_SUFFIX}`;
    try {
        const exists = await redis.exists(key);
        console.log(`[TrackerStore] Checked active status for task ${taskId}: ${exists === 1}`);
        return exists === 1;
    } catch (error) {
        console.error(`[TrackerStore] Error checking active status for task ${taskId}:`, error);
        return false; // Assume not active on error
    }
}

/**
 * Removes the active task placeholder from Redis.
 * @param taskId The unique ID of the task.
 */
export async function removeTaskPlaceholder(taskId: string): Promise<void> {
    const redis = getRedisClient();
    const key = `${TASK_ACTIVE_PREFIX}${taskId}${TASK_ACTIVE_SUFFIX}`;
    try {
        const result = await redis.del(key);
        console.log(`[TrackerStore] Removed active placeholder for task ${taskId} (Result: ${result})`);
    } catch (error) {
        console.error(`[TrackerStore] Error removing placeholder for task ${taskId}:`, error);
    }
}

// --- Pub/Sub Functions --- (Used by the Worker)

export interface TrackerEvent {
    type: 'think' | 'error' | 'complete' | 'result' | 'questionEvaluation' | 'searchQuery' | 'visitUrl' | 'readContent';
    payload: string; // The message content
}

function getChannelName(taskId: string): string {
    return `${ACTION_TRACKER_STATE_PREFIX}${taskId}`;
}

async function publishEvent(taskId: string, event: TrackerEvent): Promise<void> {
    const redis = getRedisClient();
    const channel = getChannelName(taskId);
    try {
        const message = JSON.stringify(event);
        await redis.publish(channel, message);
        console.log(`[TrackerStore] Published ${event.type} event to channel ${channel}`);
    } catch (error) {
        console.error(`[TrackerStore] Error publishing event to channel ${channel}:`, error);
    }
}

/**
 * Publishes a thinking step message to the task's Redis channel.
 * (To be called by the background worker)
 * @param taskId The unique ID of the task.
 * @param thinkMessage The thinking step description.
 */
export async function publishThink(taskId: string, thinkMessage: string): Promise<void> {
    await publishEvent(taskId, { type: 'think', payload: thinkMessage });
}

/**
 * Publishes an error message to the task's Redis channel.
 * (To be called by the background worker on failure)
 * @param taskId The unique ID of the task.
 * @param errorMessage The error description.
 */
export async function publishError(taskId: string, errorMessage: string): Promise<void> {
    await publishEvent(taskId, { type: 'error', payload: errorMessage });
}

/**
 * Publishes a completion message to the task's Redis channel.
 * (To be called by the background worker on success)
 * @param taskId The unique ID of the task.
 * @param completionMessage Optional completion message.
 */
export async function publishComplete(taskId: string, completionMessage: string = 'Task completed successfully'): Promise<void> {
    await publishEvent(taskId, { type: 'complete', payload: completionMessage });
}

/**
 * Publishes a result message to the task's Redis channel.
 * (To be called by the background worker when research is complete)
 * @param taskId The unique ID of the task.
 * @param result The research result to publish.
 */
export async function publishResult(taskId: string, result: any): Promise<void> {
    await publishEvent(taskId, { type: 'result', payload: JSON.stringify(result) });
}

/**
 * Publishes a question evaluation result to the task's Redis channel.
 * (To be called when question is evaluated)
 * @param taskId The unique ID of the task.
 * @param evaluation The question evaluation result.
 */
export async function publishQuestionEvaluation(taskId: string, evaluation: {
    think: string;
    needsDefinitive: boolean;
    needsFreshness: boolean;
    needsPlurality: boolean;
    needsCompleteness: boolean;
}): Promise<void> {
    await publishEvent(taskId, { type: 'questionEvaluation', payload: JSON.stringify(evaluation) });
}

/**
 * Publishes a search query to the task's Redis channel.
 * @param taskId The unique ID of the task.
 * @param query The search query being executed.
 */
export async function publishSearchQuery(taskId: string, query: string | { q: string; tbs?: string; gl?: string; hl?: string }): Promise<void> {
    const queryStr = typeof query === 'string' ? query : JSON.stringify(query);
    await publishEvent(taskId, { type: 'searchQuery', payload: queryStr });
}

/**
 * Publishes a URL being visited to the task's Redis channel.
 * @param taskId The unique ID of the task.
 * @param urls The URLs being visited.
 */
export async function publishVisitUrl(taskId: string, urls: string[]): Promise<void> {
    await publishEvent(taskId, { type: 'visitUrl', payload: JSON.stringify(urls) });
}

/**
 * Publishes read content information to the task's Redis channel.
 * @param taskId The unique ID of the task.
 * @param content The content that was read.
 */
export async function publishReadContent(taskId: string, content: { title: string; url: string; tokens: number }): Promise<void> {
    await publishEvent(taskId, { type: 'readContent', payload: JSON.stringify(content) });
}

// --- State Persistence Functions --- (Used by Trackers / Agent)

// Define Redis keys for tracker states
const TOKEN_TRACKER_STATE_PREFIX = 'tracker:token:';
const ACTION_TRACKER_STATE_PREFIX = 'tracker:action:';

// Import necessary types (adjust path if needed)
import { TokenUsage } from './types';
import { ActionState } from './utils/action-tracker'; // Assuming ActionState is exported from here

/**
 * Stores the state of the TokenTracker in Redis.
 * @param taskId The unique ID of the task.
 * @param state The state object to store.
 */
export async function storeTokenTrackerState(taskId: string, state: { usages: TokenUsage[], budget?: number }): Promise<void> {
    const redis = getRedisClient();
    const key = `${TOKEN_TRACKER_STATE_PREFIX}${taskId}`;
    try {
        const stateString = JSON.stringify(state);
        // Store the state, potentially with the same TTL as the task placeholder?
        await redis.set(key, stateString, 'EX', DEFAULT_TASK_TTL_SECONDS);
        console.log(`[TrackerStore] Stored TokenTracker state for task ${taskId}`);
    } catch (error) {
        console.error(`[TrackerStore] Error storing TokenTracker state for task ${taskId}:`, error);
    }
}

/**
 * Retrieves the state of the TokenTracker from Redis.
 * @param taskId The unique ID of the task.
 * @returns The stored state object or null if not found or on error.
 */
export async function getTokenTrackerState(taskId: string): Promise<{ usages: TokenUsage[], budget?: number } | null> {
    const redis = getRedisClient();
    const key = `${TOKEN_TRACKER_STATE_PREFIX}${taskId}`;
    try {
        const stateString = await redis.get(key);
        if (stateString) {
            const state = JSON.parse(stateString);
            console.log(`[TrackerStore] Retrieved TokenTracker state for task ${taskId}`);
            return state;
        }
        console.log(`[TrackerStore] No TokenTracker state found for task ${taskId}`);
        return null;
    } catch (error) {
        console.error(`[TrackerStore] Error retrieving TokenTracker state for task ${taskId}:`, error);
        return null;
    }
}

/**
 * Stores the state of the ActionTracker in Redis.
 * @param taskId The unique ID of the task.
 * @param state The state object to store.
 */
export async function storeActionTrackerState(taskId: string, state: ActionState): Promise<void> {
    const redis = getRedisClient();
    const key = `${ACTION_TRACKER_STATE_PREFIX}${taskId}`;
    try {
        const stateString = JSON.stringify(state);
        // Store the state with TTL
        await redis.set(key, stateString, 'EX', DEFAULT_TASK_TTL_SECONDS);
        console.log(`[TrackerStore] Stored ActionTracker state for task ${taskId}`);
    } catch (error) {
        console.error(`[TrackerStore] Error storing ActionTracker state for task ${taskId}:`, error);
    }
}

/**
 * Retrieves the state of the ActionTracker from Redis.
 * @param taskId The unique ID of the task.
 * @returns The stored state object or null if not found or on error.
 */
export async function getActionTrackerState(taskId: string): Promise<ActionState | null> {
    const redis = getRedisClient();
    const key = `${ACTION_TRACKER_STATE_PREFIX}${taskId}`;
    try {
        const stateString = await redis.get(key);
        if (stateString) {
            const state = JSON.parse(stateString);
            console.log(`[TrackerStore] Retrieved ActionTracker state for task ${taskId}`);
            return state;
        }
        console.log(`[TrackerStore] No ActionTracker state found for task ${taskId}`);
        return null;
    } catch (error) {
        console.error(`[TrackerStore] Error retrieving ActionTracker state for task ${taskId}:`, error);
        return null;
    }
} 