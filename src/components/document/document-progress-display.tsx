/**
 * 文档处理进度显示组件
 * 实时显示文档处理的详细进度信息
 */

'use client';

import { useDocumentProgress } from '@/hooks/use-document-progress';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentProgressDisplayProps {
  documentId: string;
  documentName?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  compact?: boolean; // 紧凑模式
}

export function DocumentProgressDisplay({
  documentId,
  documentName,
  onComplete,
  onError,
  compact = false,
}: DocumentProgressDisplayProps) {
  const {
    progress,
    progressMsg,
    status,
    error,
    isComplete,
    isConnected,
    metadata,
  } = useDocumentProgress(documentId);

  // 处理完成回调
  if (isComplete && !error && onComplete) {
    onComplete();
  }

  // 处理错误回调
  if (error && onError) {
    onError(error);
  }

  // 紧凑模式
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {!isComplete && !error && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {isComplete && !error && (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        {error && <XCircle className="h-4 w-4 text-red-500" />}
        <span className="text-sm text-muted-foreground">{progressMsg}</span>
        {!isComplete && !error && (
          <span className="text-sm font-medium">{progress}%</span>
        )}
      </div>
    );
  }

  // 详细模式
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">
              {documentName || '文档处理'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3" />
                实时连接
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="h-3 w-3" />
                已断开
              </Badge>
            )}
            {status && (
              <Badge variant="secondary">{status}</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {error ? '处理失败' : isComplete ? '处理完成' : '正在处理中...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 错误信息 */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功信息 */}
        {isComplete && !error && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              文档处理完成！
              {metadata?.pagesCount && ` 共 ${metadata.pagesCount} 页`}
              {metadata?.chunksCount && `, ${metadata.chunksCount} 个分块`}
            </AlertDescription>
          </Alert>
        )}

        {/* 进度条 */}
        {!isComplete && !error && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progressMsg}</span>
              <span className="text-sm font-mono text-muted-foreground">
                {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* 处理中的动画 */}
        {!isComplete && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>请稍候，正在处理文档...</span>
          </div>
        )}

        {/* 元数据信息 */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="mt-4 rounded-md bg-muted p-3 space-y-1">
            <div className="text-xs font-medium text-muted-foreground">处理信息</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {metadata.pagesCount !== undefined && (
                <div>
                  <span className="text-muted-foreground">页数：</span>
                  <span className="font-medium">{metadata.pagesCount}</span>
                </div>
              )}
              {metadata.chunksCount !== undefined && (
                <div>
                  <span className="text-muted-foreground">分块：</span>
                  <span className="font-medium">{metadata.chunksCount}</span>
                </div>
              )}
              {metadata.totalTokens !== undefined && (
                <div>
                  <span className="text-muted-foreground">Token：</span>
                  <span className="font-medium">{metadata.totalTokens.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 精简版进度指示器（用于列表中）
 */
export function DocumentProgressIndicator({
  documentId,
  onComplete,
}: {
  documentId: string;
  onComplete?: () => void;
}) {
  const { progress, progressMsg, error, isComplete } = useDocumentProgress(documentId);

  if (isComplete && onComplete) {
    onComplete();
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      {!isComplete && !error && (
        <>
          <Progress value={progress} className="h-1 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {progress}%
          </span>
        </>
      )}
      {isComplete && !error && (
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          完成
        </Badge>
      )}
      {error && (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          失败
        </Badge>
      )}
    </div>
  );
}

