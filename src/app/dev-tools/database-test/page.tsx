'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DatabaseConnectionTest from './components/DatabaseConnectionTest';

export default function DatabaseTestPage() {
    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-3xl font-bold mb-6">数据库测试</h1>

            <Card>
                <CardHeader>
                    <CardTitle>数据库连接测试</CardTitle>
                </CardHeader>
                <CardContent>
                    <DatabaseConnectionTest />
                </CardContent>
            </Card>
        </div>
    );
}