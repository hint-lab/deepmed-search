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
import { Loader2, Check, AlertCircle, Save, Layers } from 'lucide-react';
import { getUserSearchConfig, updateUserSearchConfig } from '@/actions/user';
import { SearchConfig, UpdateSearchConfigParams, EmbeddingProvider } from '@/types/search';

export default function EmbeddingSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 嵌入服务配置状态
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('openai');
  const [embeddingApiKey, setEmbeddingApiKey] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState('');
  const [embeddingDimension, setEmbeddingDimension] = useState(1536);
  const [hasEmbeddingApiKey, setHasEmbeddingApiKey] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getUserSearchConfig();
        if (result.success && result.data) {
          const config = result.data as SearchConfig;
          // 确保所有值都有默认值，避免 undefined 导致受控组件警告
          setEmbeddingProvider(config.embeddingProvider || 'openai');
          setEmbeddingModel(config.embeddingModel || 'text-embedding-3-small');
          setEmbeddingBaseUrl(config.embeddingBaseUrl || '');
          setEmbeddingDimension(config.embeddingDimension || 1536);
          setHasEmbeddingApiKey(config.hasEmbeddingApiKey || false);
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
      const params: UpdateSearchConfigParams = {
        embeddingProvider,
        embeddingModel,
        embeddingDimension,
      };

      // 只在用户输入了新值时更新
      if (embeddingApiKey) params.embeddingApiKey = embeddingApiKey;
      if (embeddingBaseUrl) params.embeddingBaseUrl = embeddingBaseUrl;

      const result = await updateUserSearchConfig(params);
      if (result.success) {
        toast.success('配置已保存');
        // 清空输入框并重新加载配置
        setEmbeddingApiKey('');
        setEmbeddingBaseUrl('');
        
        // 重新加载以更新状态
        const reloadResult = await getUserSearchConfig();
        if (reloadResult.success && reloadResult.data) {
          const config = reloadResult.data as SearchConfig;
          // 确保所有值都有默认值，避免 undefined 导致受控组件警告
          setEmbeddingProvider(config.embeddingProvider || 'openai');
          setEmbeddingModel(config.embeddingModel || 'text-embedding-3-small');
          setEmbeddingBaseUrl(config.embeddingBaseUrl || '');
          setEmbeddingDimension(config.embeddingDimension || 1536);
          setHasEmbeddingApiKey(config.hasEmbeddingApiKey || false);
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6" />
          嵌入服务配置
        </h1>
        <p className="text-muted-foreground mt-2">
          配置用于生成文档向量嵌入的服务，用于知识库向量搜索。
        </p>
      </div>

      {/* 嵌入服务配置 */}
      <Card>
        <CardHeader>
          <CardTitle>嵌入服务提供商</CardTitle>
          <CardDescription>
            选择嵌入服务提供商并配置相关参数
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 嵌入服务提供商 */}
          <div className="space-y-2">
            <Label htmlFor="embeddingProvider">服务提供商</Label>
            <Select value={embeddingProvider} onValueChange={(v) => setEmbeddingProvider(v as EmbeddingProvider)}>
              <SelectTrigger>
                <SelectValue placeholder="选择嵌入服务" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI 兼容</SelectItem>
                <SelectItem value="volcengine">火山引擎</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              支持 OpenAI 官方服务或任何 OpenAI 兼容的嵌入服务
            </p>
          </div>

          {/* 嵌入服务 API Key */}
          <div className="space-y-2">
            <Label htmlFor="embeddingApiKey" className="flex items-center gap-2">
              API Key
              {hasEmbeddingApiKey && (
                <span className="text-sm text-green-600">
                  <Check className="inline h-3 w-3" /> 已配置
                </span>
              )}
            </Label>
            <Input
              id="embeddingApiKey"
              type="password"
              placeholder={hasEmbeddingApiKey ? "留空保持不变" : "输入嵌入服务 API Key"}
              value={embeddingApiKey}
              onChange={(e) => setEmbeddingApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {embeddingProvider === 'volcengine' 
                ? '火山引擎 ARK API Key。获取方式：访问火山引擎控制台 → 模型推理 → 创建 API Key'
                : 'OpenAI API Key 或其他兼容服务的 API Key。获取方式：访问 OpenAI 官网或您的服务提供商'}
            </p>
          </div>

          {/* 嵌入模型 */}
          <div className="space-y-2">
            <Label htmlFor="embeddingModel">嵌入模型</Label>
            <Input
              id="embeddingModel"
              type="text"
              placeholder="text-embedding-3-small"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {embeddingProvider === 'volcengine' 
                ? '火山引擎推理端点 ID（格式：ep-xxx-xxx）。在火山引擎控制台创建嵌入模型推理端点后获取'
                : 'OpenAI 嵌入模型名称。推荐：text-embedding-3-small (1536维) 或 text-embedding-3-large (3072维)'}
            </p>
          </div>

          {/* 嵌入服务 Base URL (可选) */}
          <div className="space-y-2">
            <Label htmlFor="embeddingBaseUrl">Base URL (可选)</Label>
            <Input
              id="embeddingBaseUrl"
              type="text"
              placeholder={embeddingProvider === 'volcengine' ? 'https://ark.cn-beijing.volces.com/api/v3' : 'https://api.openai.com/v1'}
              value={embeddingBaseUrl}
              onChange={(e) => setEmbeddingBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              自定义 API 端点地址。如使用官方服务可留空，使用自托管或代理服务时填写
            </p>
          </div>

          {/* 向量维度 */}
          <div className="space-y-2">
            <Label htmlFor="embeddingDimension">向量维度</Label>
            <Input
              id="embeddingDimension"
              type="number"
              min="1"
              max="4096"
              value={String(embeddingDimension ?? 1536)}
              onChange={(e) => setEmbeddingDimension(parseInt(e.target.value) || 1536)}
            />
            <p className="text-xs text-muted-foreground">
              嵌入向量的维度。常用值：text-embedding-3-small=1536，text-embedding-3-large=3072，text-embedding-ada-002=1536
            </p>
          </div>

          {/* 保存按钮 */}
          <div className="pt-4">
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

      {/* 使用说明 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium">配置说明：</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>嵌入服务用于将文档内容转换为向量，实现语义搜索</li>
                <li>支持 OpenAI 官方服务、自托管服务和火山引擎</li>
                <li>向量维度必须与模型保持一致，否则会导致搜索失败</li>
                <li>更改嵌入配置后，需要重新索引已有文档才能生效</li>
                <li>API Key 会被加密存储在数据库中，确保安全</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 常用配置参考 */}
      <Card>
        <CardHeader>
          <CardTitle>常用配置参考</CardTitle>
          <CardDescription>
            常见嵌入服务的配置参数
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium">OpenAI 官方服务</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• 提供商：OpenAI 兼容</li>
                <li>• 模型：text-embedding-3-small</li>
                <li>• 维度：1536</li>
                <li>• Base URL：留空（使用默认）</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium">火山引擎</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• 提供商：火山引擎</li>
                <li>• 模型：ep-xxx-xxx（您的推理端点 ID）</li>
                <li>• 维度：根据模型而定（通常 1024 或 1536）</li>
                <li>• Base URL：留空（使用默认）</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium">自托管 / 代理服务</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• 提供商：OpenAI 兼容</li>
                <li>• 模型：根据您的服务而定</li>
                <li>• 维度：根据模型而定</li>
                <li>• Base URL：填写您的服务地址</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

