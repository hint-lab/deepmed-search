"use client";

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ThinkStep {
    think: string;
}

// Define props interface
interface ThinkStatusDisplayProps {
    taskId: string | null;
}

export default function ThinkStatusDisplay({ taskId }: ThinkStatusDisplayProps) {
    const [thoughts, setThoughts] = useState<ThinkStep[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

    useEffect(() => {
        // Reset state when taskId changes or becomes null
        setThoughts([]);
        setIsConnected(false);
        setError(null);

        if (!taskId) {
            console.log("ThinkStatusDisplay: No taskId provided, waiting...");
            return; // Don't connect if no taskId
        }

        console.log(`ThinkStatusDisplay: Attempting to connect with taskId: ${taskId}`);
        const eventSource = new EventSource(`/api/research/stream?taskId=${taskId}`);
        let currentEventSource: EventSource | null = eventSource; // Keep track for cleanup

        eventSource.onopen = () => {
            console.log(`ThinkStatusDisplay: SSE connection opened successfully for taskId: ${taskId}`);
            setIsConnected(true);
            setError(null); // Clear any previous error on successful connection
        };

        eventSource.onmessage = (event) => {
            try {
                const data: ThinkStep = JSON.parse(event.data);
                if (data.think) {
                    setThoughts(prev => [...prev, data]);
                    // Auto-scroll to bottom
                    setTimeout(() => {
                        const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                        if (scrollViewport) {
                            scrollViewport.scrollTop = scrollViewport.scrollHeight;
                        }
                    }, 0); // Timeout ensures DOM update before scrolling
                }
            } catch (e) {
                console.error(`ThinkStatusDisplay: Failed to parse think data for taskId ${taskId}:`, e, "Data:", event.data);
                // Optionally set an error state to display to the user
                // setError("无法处理收到的思考步骤信息。");
            }
        };

        eventSource.onerror = (err) => {
            // Avoid logging errors caused by intentional closing or page navigation
            if (currentEventSource && currentEventSource.readyState !== EventSource.CLOSED) {
                console.error(`ThinkStatusDisplay: SSE connection error for taskId ${taskId}:`, err);
                setError(`无法连接到思考过程流 (ID: ${taskId}). 请稍后重试或检查网络连接。`);
                setIsConnected(false);
                currentEventSource?.close(); // Close on error
                currentEventSource = null;
            } else {
                console.log(`ThinkStatusDisplay: SSE connection closed for taskId: ${taskId}.`);
                setIsConnected(false); // Ensure status is false if closed cleanly
            }
        };

        // Cleanup function
        return () => {
            if (currentEventSource) {
                console.log(`ThinkStatusDisplay: Closing SSE connection for taskId: ${taskId}`);
                currentEventSource.close();
                currentEventSource = null;
            }
            // Reset connection status on cleanup only if it wasn't already set to false by onerror
            // setIsConnected(false); // This might be redundant if onerror always fires on close
        };
    }, [taskId]); // Dependency array ensures effect runs when taskId changes


    const renderContent = () => {
        if (!taskId) {
            return (
                <div className="flex items-start space-x-2 p-4">
                    <span className="text-xl mt-1">⏱️</span>
                    <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                        等待研究任务启动...
                    </CardContent>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-start space-x-2 p-4">
                    <span className="text-xl mt-1">⚠️</span>
                    <CardContent className="flex-1 bg-destructive/10 border border-destructive/30 p-4 rounded-lg text-sm text-destructive">
                        {error}
                    </CardContent>
                </div>
            );
        }


        if (!isConnected && !error) {
            return (
                <div className="flex items-start space-x-2 p-4 animate-pulse">
                    <span className="text-xl mt-1">📡</span>
                    <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                        正在连接思考过程流...
                    </CardContent>
                </div>
            );
        }

        if (isConnected && thoughts.length === 0) {
            return (
                <div className="flex items-start space-x-2 p-4">
                    <span className="text-xl mt-1">⏳</span>
                    <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                        已连接，等待第一个思考步骤...
                    </CardContent>
                </div>
            );
        }

        return thoughts.map((step, index) => (
            <div key={index} className="flex items-start space-x-2 mb-4 animate-in fade-in slide-in-from-bottom-5 duration-300 p-4">
                <span className="text-xl mt-1">🤔</span>
                <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap break-words">
                    {step.think}
                </CardContent>
            </div>
        ));
    }


    return (
        <Card className="w-full max-w-2xl mx-auto mt-1 border border-border/60 shadow-sm"> {/* Adjusted max-width and margins */}
            {/* Assign ref to ScrollArea */}
            <ScrollArea className="h-[300px]" ref={scrollAreaRef}> {/* Adjusted height */}
                {renderContent()}
            </ScrollArea>
        </Card>
    );
}