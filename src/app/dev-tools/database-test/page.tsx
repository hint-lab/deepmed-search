'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DatabaseConnectionTest from './components/DatabaseConnectionTest';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function DatabaseTestPage() {
    const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('offline');
    const [loadingStatus, setLoadingStatus] = useState(false);

    const checkServerStatus = async () => {
        setLoadingStatus(true);
        try {
            const response = await fetch('/api/database-test/connection');
            const data = await response.json();

            if (data.success && data.data?.[0]?.connected === 1) {
                setServerStatus('online');
            } else {
                setServerStatus('offline');
            }
        } catch (error) {
            setServerStatus('offline');
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        checkServerStatus();
        const interval = setInterval(checkServerStatus, 30000); // 每30秒检查一次

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-3xl font-bold mb-6">数据库测试</h1>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Database className="mr-2 h-5 w-5" />
                            <CardTitle>数据库服务器状态</CardTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={checkServerStatus}
                            disabled={loadingStatus}
                        >
                            {loadingStatus ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                '刷新'
                            )}
                        </Button>
                    </div>
                    <CardDescription>
                        显示数据库服务器的连接状态和基本信息
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <div
                                className={cn(
                                    'w-3 h-3 rounded-full mr-2',
                                    serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                )}
                            />
                            <span className="font-medium">
                                状态: {serverStatus === 'online' ? '正常' : '异常'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted rounded-md">
                                <div className="text-sm text-muted-foreground">连接状态</div>
                                <div className="text-lg font-medium">
                                    {serverStatus === 'online' ? '已连接' : '未连接'}
                                </div>
                            </div>
                            <div className="p-3 bg-muted rounded-md">
                                <div className="text-sm text-muted-foreground">最后检查</div>
                                <div className="text-lg font-medium">
                                    {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">连接测试</h3>
                            <DatabaseConnectionTest />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}