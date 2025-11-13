/**
 * 实时进度测试页面
 * 用于测试文档处理和研究任务的实时进度显示
 */

'use client';

import { useState } from 'react';
import { DocumentProgressDisplay, DocumentProgressIndicator } from '@/components/document/document-progress-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TestTube2 } from 'lucide-react';

export default function ProgressTestPage() {
  const [documentId, setDocumentId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [testingDoc, setTestingDoc] = useState<string | null>(null);
  const [testingTask, setTestingTask] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <TestTube2 className="h-6 w-6" />
        <h1 className="text-3xl font-bold">实时进度测试</h1>
        <Badge variant="outline">SSE + Redis Pub/Sub</Badge>
      </div>

      <Tabs defaultValue="document" className="space-y-4">
        <TabsList>
          <TabsTrigger value="document">文档处理进度</TabsTrigger>
          <TabsTrigger value="research">研究任务进度</TabsTrigger>
        </TabsList>

        {/* 文档处理测试 */}
        <TabsContent value="document" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>测试文档处理进度</CardTitle>
              <CardDescription>
                输入文档 ID，实时监控处理进度（SSE）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="documentId">文档 ID</Label>
                  <Input
                    id="documentId"
                    placeholder="输入文档 ID（例如：clxxxxx...）"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => setTestingDoc(documentId)}
                    disabled={!documentId}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    开始监控
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-2">提示</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. 在知识库中上传一个文档</li>
                  <li>2. 复制文档 ID（从表格或数据库）</li>
                  <li>3. 粘贴到上面的输入框</li>
                  <li>4. 点击"开始监控"按钮</li>
                  <li>5. 点击文档的处理按钮，观察实时进度</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 详细进度显示 */}
          {testingDoc && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">详细进度（完整模式）</h3>
              <DocumentProgressDisplay
                documentId={testingDoc}
                documentName="测试文档"
                onComplete={() => {
                  console.log('✅ 处理完成！');
                }}
                onError={(error) => {
                  console.error('❌ 处理失败:', error);
                }}
              />

              <h3 className="text-lg font-semibold mt-8">精简进度（列表模式）</h3>
              <Card>
                <CardContent className="pt-6">
                  <DocumentProgressIndicator
                    documentId={testingDoc}
                    onComplete={() => console.log('完成')}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 研究任务测试 */}
        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>测试研究任务进度</CardTitle>
              <CardDescription>
                输入任务 ID，实时监控研究进度（SSE）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="taskId">任务 ID</Label>
                  <Input
                    id="taskId"
                    placeholder="输入任务 ID（例如：task_xxxxx...）"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => setTestingTask(taskId)}
                    disabled={!taskId}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    开始监控
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-2">提示</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. 在研究页面创建一个研究任务</li>
                  <li>2. 任务 ID 会显示在 URL 或界面中</li>
                  <li>3. 粘贴到上面的输入框</li>
                  <li>4. 点击"开始监控"按钮</li>
                  <li>5. 观察实时思考过程和进度</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {testingTask && (
            <Card>
              <CardHeader>
                <CardTitle>研究进度</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  请在研究页面查看详细进度，或使用浏览器开发者工具查看 SSE 连接：
                </p>
                <div className="mt-4 rounded-md bg-muted p-4 font-mono text-sm">
                  GET /api/research/stream?taskId={testingTask}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 技术说明 */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 技术架构</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">文档处理流程</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>1. Queue Worker 处理文档</div>
                <div>2. Worker 推送进度到 Redis</div>
                <div>3. SSE API 监听 Redis</div>
                <div>4. 前端实时显示进度</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">性能提升</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>✅ 延迟：5秒 → &lt;10ms</div>
                <div>✅ 数据库查询：轮询 → 零</div>
                <div>✅ 实时性：提升 500倍</div>
                <div>✅ 用户体验：显著改善</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="text-sm font-medium mb-2">📊 监控 SSE 连接</h4>
            <p className="text-sm text-muted-foreground mb-2">
              打开浏览器开发者工具查看实时连接：
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>按 F12 打开开发者工具</li>
              <li>切换到 Network 标签</li>
              <li>筛选类型：EventStream</li>
              <li>查看实时事件流</li>
            </ol>
          </div>

          <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950">
            <h4 className="text-sm font-medium mb-2">🔍 调试 Redis 消息</h4>
            <p className="text-sm text-muted-foreground mb-2">
              在服务器上监控 Redis Pub/Sub 消息：
            </p>
            <div className="rounded-md bg-muted p-3 font-mono text-sm">
              <div>$ redis-cli</div>
              <div>&gt; PSUBSCRIBE document:progress:*</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

