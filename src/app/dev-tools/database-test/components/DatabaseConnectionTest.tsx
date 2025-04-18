'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DatabaseConnectionTest() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // 测试数据库连接
    const testConnection = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/database-test/connection');
            const data = await response.json();

            if (data.success) {
                setResult(data);
                toast.success('数据库连接成功');
            } else {
                setError(data.error || '数据库连接失败');
                toast.error('数据库连接失败');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
            toast.error('测试过程中发生错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Button onClick={testConnection} disabled={loading}>
                {loading ? '测试中...' : '测试数据库连接'}
            </Button>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                    <p className="font-semibold">错误:</p>
                    <p>{error}</p>
                </div>
            )}

            {result && (
                <div className="p-4 bg-gray-50 rounded-md">
                    <p className="font-semibold">结果:</p>
                    <pre className="mt-2 overflow-auto max-h-60 text-sm">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
} 