// src/app/api/research/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNewRedisClient } from '@/lib/redis-client';
import { checkTaskActive } from '@/lib/deep-research/tracker-store'; // Correct path assumes tracker-store.ts is in src/lib
import type { Redis } from 'ioredis';

// Remove in-memory store and related functions
// const activeTrackers = new Map<string, ActionTracker>();
// export function storeTracker(...) { ... }
// export function removeTracker(...) { ... }

// Define the expected event structure from Redis Pub/Sub
interface TrackerEvent {
    type: 'think' | 'error' | 'complete';
    payload: string;
}

export async function GET(req: NextRequest) {
    const taskId = req.nextUrl.searchParams.get('taskId');

    if (!taskId) {
        return new NextResponse(JSON.stringify({ error: "Missing 'taskId' query parameter." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Check if the task is actually active/exists using Redis
    const isActive = await checkTaskActive(taskId);
    if (!isActive) {
        console.warn(`SSE connection attempt for inactive/invalid taskId: ${taskId}`);
        return new NextResponse(JSON.stringify({ error: 'Task not found or not active for the given taskId.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    console.log(`SSE connection initiated for active taskId: ${taskId}`);

    let subscriber: Redis | null = null;
    const channel = `tracker:${taskId}`;

    const stream = new ReadableStream({
        async start(controller) {
            console.log(`[SSE ${taskId}] Attempting to create Redis subscriber...`);
            try {
                subscriber = createNewRedisClient();
            } catch (err) {
                console.error(`[SSE ${taskId}] Failed to create Redis subscriber:`, err);
                controller.error(new Error('Failed to initialize Redis connection'));
                return;
            }

            subscriber.on('connect', () => console.log(`[SSE ${taskId}] Redis subscriber connected.`));
            subscriber.on('ready', () => console.log(`[SSE ${taskId}] Redis subscriber ready.`));
            subscriber.on('error', (err) => {
                console.error(`[SSE ${taskId}] Redis subscriber error:`, err);
                controller.error(new Error('Redis subscription error'));
            });

            // Listener for messages from the Redis channel
            subscriber.on('message', (ch, message) => {
                if (ch === channel) {
                    console.log(`[SSE ${taskId}] Received message on channel ${channel}:`, message);
                    try {
                        const event: TrackerEvent = JSON.parse(message);
                        let data = '';

                        switch (event.type) {
                            case 'think':
                                data = `data: ${JSON.stringify({ think: event.payload })}\n\n`;
                                break;
                            case 'error':
                                data = `data: ${JSON.stringify({ error: event.payload })}\n\n`;
                                // Optionally close stream on error, or let client decide
                                // controller.close();
                                break;
                            case 'complete':
                                data = `data: ${JSON.stringify({ complete: event.payload })}\n\n`;
                                controller.close(); // Close the stream on completion
                                console.log(`[SSE ${taskId}] Task completed, closing SSE stream.`);
                                break;
                            default:
                                console.warn(`[SSE ${taskId}] Received unknown event type:`, event.type);
                                return; // Ignore unknown event types
                        }

                        controller.enqueue(new TextEncoder().encode(data));

                    } catch (e) {
                        console.error(`[SSE ${taskId}] Error processing message:`, e, "Raw Message:", message);
                        // Optionally signal an error to the client
                        // controller.error(new Error('Failed to process stream data.'));
                    }
                }
            });

            try {
                await subscriber.subscribe(channel);
                console.log(`[SSE ${taskId}] Subscribed to Redis channel: ${channel}`);
            } catch (err) {
                console.error(`[SSE ${taskId}] Failed to subscribe to Redis channel ${channel}:`, err);
                controller.error(new Error('Failed to subscribe to Redis channel'));
            }
        },
        cancel(reason) {
            // This gets called if the stream consumer cancels (e.g., client disconnects)
            // or if controller.close() or controller.error() is called.
            console.log(`[SSE ${taskId}] Stream cancelled. Reason: ${reason}. Cleaning up Redis subscriber.`);
            if (subscriber) {
                // Use Promise.allSettled to attempt both unsubscribe and quit
                Promise.allSettled([
                    subscriber.unsubscribe(channel),
                    subscriber.quit()
                ]).then(results => {
                    results.forEach((result, i) => {
                        if (result.status === 'rejected') {
                            const action = i === 0 ? 'unsubscribing' : 'quitting';
                            console.error(`[SSE ${taskId}] Error ${action} Redis subscriber:`, result.reason);
                        }
                    });
                    subscriber = null;
                });
            }
            // Optional: Consider removing task placeholder if cancellation means task abortion
            // await removeTaskPlaceholder(taskId);
        }
    });

    // Return the stream with SSE headers
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        },
    });
}

// Reminder:
// 1. In your main research API endpoint (e.g., POST /api/research):
//    - Generate a unique `taskId`.
//    - Create the `Agent` and its `context` (containing `actionTracker`).
//    - Call `storeTracker(taskId, context.actionTracker)`.
//    - Return the `taskId` to the frontend.
// 2. When the research task is fully completed or fails in the main endpoint:
//    - Call `removeTracker(taskId)` to clean up the memory store.
// 3. Replace the in-memory `activeTrackers` Map with a robust solution (like Redis)
//    for production environments, especially if running multiple server instances.