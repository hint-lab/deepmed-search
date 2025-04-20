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

interface TrackerEvent {
    type: 'think' | 'error' | 'complete';
    payload: string; // The message content
}

function getChannelName(taskId: string): string {
    return `${TRACKER_CHANNEL_PREFIX}${taskId}`;
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