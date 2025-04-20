// src/app/api/research/stream/route.ts
import { NextRequest } from 'next/server';
import { ActionTracker } from '@/lib/deep-research/utils/action-tracker'; // Adjust path
import { StepAction } from '@/lib/deep-research/types'; // Adjust path



export async function GET(req: NextRequest) {
    // Get the specific ActionTracker for this request
    const actionTracker = getActionTrackerInstance(req);

    // Create a ReadableStream to send events
    const stream = new ReadableStream({
        start(controller) {
            const listener = (stepData: StepAction) => {
                try {
                    // 只发送 think 属性
                    const thinkData = { think: stepData.think };
                    const data = `data: ${JSON.stringify(thinkData)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(data));
                } catch (error) {
                    console.error("Error encoding/enqueuing SSE data:", error);
                }
            };

            console.log("SSE Client connected, attaching listener.");
            actionTracker.on('action', listener);

            // Handle client disconnection (browser closes connection)
            // Note: Reliably detecting disconnection in Route Handlers can be tricky.
            // Keep-alive pings or monitoring the stream might be needed in robust scenarios.
            // This basic example relies on the client closing the connection.
            // We'll remove the listener when the stream is cancelled (e.g., by client closing).
            this.cancel = () => {
                console.log("SSE Client disconnected, removing listener.");
                actionTracker.off('action', listener);
                // Optional: Clean up the tracker instance if it's request-specific
                // if (actionTracker === globalTracker) globalTracker = null; // Example cleanup
            };
        },
        cancel() {
            // This gets called if the stream consumer cancels reading.
            // The listener removal is handled in the start method's `this.cancel`.
            console.log("SSE Stream cancelled by consumer.");
        }
    });

    // Return the stream with SSE headers
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}