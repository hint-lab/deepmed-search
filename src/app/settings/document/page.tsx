'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, AlertCircle, Save, FileText } from 'lucide-react';
import { getUserSearchConfig, updateUserSearchConfig } from '@/actions/user';
import { SearchConfig, DocumentParser } from '@/types/search';

export default function DocumentSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 表单状态
  const [documentParser, setDocumentParser] = useState<DocumentParser>('markitdown-docker');
  const [mineruApiKey, setMineruApiKey] = useState('');
  
  // 配置状态标识
  const [hasMineruApiKey, setHasMineruApiKey] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getUserSearchConfig();
        if (result.success && result.data) {
          const config = result.data as SearchConfig;
          setDocumentParser(config.documentParser);
          setHasMineruApiKey(config.hasMineruApiKey);
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        toast.error('加载配置失败');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      loadConfig();
    }
  }, [session]);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      const params: any = {
        documentParser,
      };

      // 只在用户输入了新值时更新
      if (mineruApiKey) params.mineruApiKey = mineruApiKey;

      const result = await updateUserSearchConfig(params);
      if (result.success) {
        toast.success('配置已保存');
        // 清空输入框并重新加载配置
        setMineruApiKey('');
        
        // 重新加载以更新状态
        const reloadResult = await getUserSearchConfig();
        if (reloadResult.success && reloadResult.data) {
          const config = reloadResult.data as SearchConfig;
          setDocumentParser(config.documentParser);
          setHasMineruApiKey(config.hasMineruApiKey);
        }
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">文档解析器配置</h1>
        <p className="text-muted-foreground mt-2">
          选择文档解析引擎，支持 PDF、Word、PPT 等多种格式。
        </p>
      </div>

      {/* 文档解析器选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            文档解析器
          </CardTitle>
          <CardDescription>
            选择处理上传文档的解析引擎
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentParser">解析器类型</Label>
            <Select value={documentParser} onValueChange={(v) => setDocumentParser(v as DocumentParser)}>
              <SelectTrigger>
                <SelectValue placeholder="选择文档解析器" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markitdown-docker">MarkItDown</SelectItem>
                <SelectItem value="mineru-docker">MinerU</SelectItem>
                <SelectItem value="mineru-cloud">MinerU Cloud</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground space-y-2 pt-2">
              <div className="p-3 bg-muted/50 rounded-md space-y-1.5">
                <p><strong className="text-foreground">MarkItDown</strong></p>
                <p>• 快速、轻量级</p>
                <p>• 适合简单文档（PDF、Word、Excel 等）</p>
                <p>• 本地 Docker 部署，不需要 API Key</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-md space-y-1.5">
                <p><strong className="text-foreground">MinerU</strong></p>
                <p>• 支持复杂 PDF 文档</p>
                <p>• 强大的 OCR 能力，处理扫描件</p>
                <p>• 本地 Docker 部署，不需要 API Key</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-md space-y-1.5">
                <p><strong className="text-foreground">MinerU Cloud</strong></p>
                <p>• 云端服务，处理速度快</p>
                <p>• 需要配置 MinerU Cloud API Key</p>
                <p>• 适合高并发场景</p>
              </div>
            </div>
            {documentParser === 'mineru-cloud' && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-md">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  💡 使用 MinerU Cloud 需要配置下方的 API Key
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MinerU Cloud API Key 配置 */}
      <Card>
        <CardHeader>
          <CardTitle>MinerU Cloud API Key</CardTitle>
          <CardDescription>
            仅使用 MinerU Cloud 时需要配置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mineruApiKey" className="flex items-center gap-2">
              API Key {documentParser === 'mineru-cloud' ? '(必填)' : '(可选)'}
              {hasMineruApiKey && (
                <span className="text-sm text-green-600">
                  <Check className="inline h-3 w-3" /> 已配置
                </span>
              )}
            </Label>
            <Input
              id="mineruApiKey"
              type="password"
              placeholder={hasMineruApiKey ? "留空保持不变" : "输入 MinerU Cloud API Key"}
              value={mineruApiKey}
              onChange={(e) => setMineruApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              获取 API Key: <a href="https://mineru.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://mineru.net</a>
            </p>
            {documentParser === 'mineru-cloud' && !hasMineruApiKey && !mineruApiKey && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-md">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  ⚠️ 当前选择了 MinerU Cloud，必须配置 API Key 才能使用
                </p>
              </div>
            )}
          </div>

          {/* 保存按钮 */}
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存配置
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 提示信息 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium">配置说明：</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>MarkItDown 和 MinerU 无需配置，开箱即用</li>
                <li>MinerU Cloud 需要从 mineru.net 获取 API Key</li>
                <li>API Key 会被加密存储在数据库中</li>
                <li>更换解析器后，新上传的文档将使用新的解析器处理</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

