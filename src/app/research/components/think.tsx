"use client"; // 标记为客户端组件

import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ThinkStep {
    think: string;
}

export default function ThinkStatusDisplay() {
    const [thoughts, setThoughts] = useState<ThinkStep[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const eventSource = new EventSource('/api/research/stream');

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data: ThinkStep = JSON.parse(event.data);
                if (data.think) {
                    setThoughts(prev => [...prev, data]);
                }
            } catch (e) {
                console.error("Failed to parse think data:", e);
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();
        };

        return () => {
            eventSource.close();
            setIsConnected(false);
        };
    }, []);

    return (
        <Card className="w-full mx-auto mt-4">
            <ScrollArea className="h-[400px] p-4">
                {thoughts.map((step, index) => (
                    <div key={index} className="flex items-start space-x-2 mb-4 animate-in fade-in slide-in-from-bottom-5">
                        <span className="text-xl mt-1">🤔</span>
                        <CardContent className="flex-1 bg-muted p-4 rounded-lg">
                            {step.think}
                        </CardContent>
                    </div>
                ))}

                {isConnected && thoughts.length === 0 && (
                    <div className="flex items-start space-x-2 mb-4">
                        <span className="text-xl mt-1">⏳</span>
                        <CardContent className="flex-1 bg-muted p-4 rounded-lg">
                            正在思考中...
                        </CardContent>
                    </div>
                )}
            </ScrollArea>
        </Card>
    );
}