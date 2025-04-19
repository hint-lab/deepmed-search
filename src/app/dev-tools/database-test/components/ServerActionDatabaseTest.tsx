'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { testDatabaseConnection, testPrismaOperations, executeCustomQuery } from '../actions';
import { Textarea } from '@/components/ui/textarea';

export default function ServerActionDatabaseTest() {
    const [connectionLoading, setConnectionLoading] = useState(false);
    const [prismaLoading, setPrismaLoading] = useState(false);
    const [customQueryLoading, setCustomQueryLoading] = useState(false);
    const [connectionResult, setConnectionResult] = useState<any>(null);
    const [prismaResult, setPrismaResult] = useState<any>(null);
    const [customQueryResult, setCustomQueryResult] = useState<any>(null);
    const [customQuery, setCustomQuery] = useState('SELECT 1 as test');

    // 测试数据库连接
    const handleTestConnection = async () => {
        setConnectionLoading(true);
        try {
            const result = await testDatabaseConnection();
            setConnectionResult(result);

            if (result.success) {
                toast.success('数据库连接成功');
            } else {
                toast.error(`数据库连接失败: ${result.message}`);
            }
        } catch (error) {
            toast.error('测试过程中发生错误');
            setConnectionResult({
                success: false,
                message: error instanceof Error ? error.message : '未知错误'
            });
        } finally {
            setConnectionLoading(false);
        }
    };

    // 测试Prisma操作
    const handleTestPrisma = async () => {
        setPrismaLoading(true);
        try {
            const result = await testPrismaOperations();
            setPrismaResult(result);

            if (result.success) {
                toast.success('Prisma操作成功');
            } else {
                toast.error(`Prisma操作失败: ${result.message}`);
            }
        } catch (error) {
            toast.error('测试过程中发生错误');
            setPrismaResult({
                success: false,
                message: error instanceof Error ? error.message : '未知错误'
            });
        } finally {
            setPrismaLoading(false);
        }
    };

    // 执行自定义查询
    const handleExecuteCustomQuery = async () => {
        if (!customQuery.trim()) {
            toast.error('请输入有效的SQL查询');
            return;
        }

        setCustomQueryLoading(true);
        try {
            const result = await executeCustomQuery(customQuery);
            setCustomQueryResult(result);

            if (result.success) {
                toast.success('查询执行成功');
            } else {
                toast.error(`查询执行失败: ${result.message}`);
            }
        } catch (error) {
            toast.error('执行查询过程中发生错误');
            setCustomQueryResult({
                success: false,
                message: error instanceof Error ? error.message : '未知错误'
            });
        } finally {
            setCustomQueryLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Server Action 数据库测试</CardTitle>
                    <CardDescription>
                        使用Server Action测试数据库连接和Prisma操作
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-4">
                        <Button onClick={handleTestConnection} disabled={connectionLoading}>
                            {connectionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    测试中...
                                </>
                            ) : (
                                '测试数据库连接'
                            )}
                        </Button>

                        <Button onClick={handleTestPrisma} disabled={prismaLoading}>
                            {prismaLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    测试中...
                                </>
                            ) : (
                                '测试Prisma操作'
                            )}
                        </Button>
                    </div>

                    {connectionResult && (
                        <div className={`p-4 rounded-md ${connectionResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="font-semibold">数据库连接结果:</p>
                            <pre className="mt-2 overflow-auto max-h-60 text-sm">
                                {JSON.stringify(connectionResult, null, 2)}
                            </pre>
                        </div>
                    )}

                    {prismaResult && (
                        <div className={`p-4 rounded-md ${prismaResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="font-semibold">Prisma操作结果:</p>
                            <pre className="mt-2 overflow-auto max-h-60 text-sm">
                                {JSON.stringify(prismaResult, null, 2)}
                            </pre>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">自定义SQL查询</h3>
                        <Textarea
                            value={customQuery}
                            onChange={(e) => setCustomQuery(e.target.value)}
                            placeholder="输入SQL查询语句"
                            className="min-h-[100px] font-mono"
                        />
                        <Button onClick={handleExecuteCustomQuery} disabled={customQueryLoading}>
                            {customQueryLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    执行中...
                                </>
                            ) : (
                                '执行查询'
                            )}
                        </Button>

                        {customQueryResult && (
                            <div className={`p-4 rounded-md ${customQueryResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                <p className="font-semibold">查询结果:</p>
                                <pre className="mt-2 overflow-auto max-h-60 text-sm">
                                    {JSON.stringify(customQueryResult, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 