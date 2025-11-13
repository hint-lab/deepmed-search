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
import { Loader2, Check, AlertCircle, Save } from 'lucide-react';
import { getUserSearchConfig, updateUserSearchConfig } from '@/actions/user';
import { SearchConfig, UpdateSearchConfigParams } from '@/types/search';

export default function SearchSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 表单状态
  const [searchProvider, setSearchProvider] = useState<'tavily' | 'jina'>('jina');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [jinaApiKey, setJinaApiKey] = useState('');
  const [ncbiApiKey, setNcbiApiKey] = useState('');
  
  // 嵌入服务配置状态
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('openai');
  const [embeddingApiKey, setEmbeddingApiKey] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState('');
  const [embeddingDimension, setEmbeddingDimension] = useState(1536);
  
  // 配置状态标识
  const [hasTavilyApiKey, setHasTavilyApiKey] = useState(false);
  const [hasJinaApiKey, setHasJinaApiKey] = useState(false);
  const [hasNcbiApiKey, setHasNcbiApiKey] = useState(false);
  const [hasEmbeddingApiKey, setHasEmbeddingApiKey] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getUserSearchConfig();
        if (result.success && result.data) {
          const config = result.data as SearchConfig;
          setSearchProvider(config.searchProvider);
          setEmbeddingProvider(config.embeddingProvider);
          setEmbeddingModel(config.embeddingModel);
          setEmbeddingBaseUrl(config.embeddingBaseUrl || '');
          setEmbeddingDimension(config.embeddingDimension);
          setHasTavilyApiKey(config.hasTavilyApiKey);
          setHasJinaApiKey(config.hasJinaApiKey);
          setHasNcbiApiKey(config.hasNcbiApiKey);
          setHasEmbeddingApiKey(config.hasEmbeddingApiKey);
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
        searchProvider,
        embeddingProvider,
        embeddingModel,
        embeddingDimension,
      };

      // 只在用户输入了新值时更新
      if (tavilyApiKey) params.tavilyApiKey = tavilyApiKey;
      if (jinaApiKey) params.jinaApiKey = jinaApiKey;
      if (ncbiApiKey) params.ncbiApiKey = ncbiApiKey;
      if (embeddingApiKey) params.embeddingApiKey = embeddingApiKey;
      if (embeddingBaseUrl) params.embeddingBaseUrl = embeddingBaseUrl;

      const result = await updateUserSearchConfig(params);
      if (result.success) {
        toast.success('配置已保存');
        // 清空输入框并重新加载配置
        setTavilyApiKey('');
        setJinaApiKey('');
        setNcbiApiKey('');
        setEmbeddingApiKey('');
        setEmbeddingBaseUrl('');
        
        // 重新加载以更新状态
        const reloadResult = await getUserSearchConfig();
        if (reloadResult.success && reloadResult.data) {
          const config = reloadResult.data as SearchConfig;
          setSearchProvider(config.searchProvider);
          setEmbeddingProvider(config.embeddingProvider);
          setEmbeddingModel(config.embeddingModel);
          setEmbeddingBaseUrl(config.embeddingBaseUrl || '');
          setEmbeddingDimension(config.embeddingDimension);
          setHasTavilyApiKey(config.hasTavilyApiKey);
          setHasJinaApiKey(config.hasJinaApiKey);
          setHasNcbiApiKey(config.hasNcbiApiKey);
          setHasEmbeddingApiKey(config.hasEmbeddingApiKey);
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
        <h1 className="text-2xl font-bold">搜索配置</h1>
        <p className="text-muted-foreground mt-2">
          配置 Web 搜索和 Deep Research 使用的搜索引擎及 API Key。
        </p>
      </div>

      {/* 搜索引擎配置 */}
      <Card>
        <CardHeader>
          <CardTitle>搜索引擎</CardTitle>
          <CardDescription>
            选择默认的搜索引擎提供商
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="searchProvider">默认搜索引擎</Label>
            <Select value={searchProvider} onValueChange={(v) => setSearchProvider(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="选择搜索引擎" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tavily">Tavily</SelectItem>
                <SelectItem value="jina">Jina</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deep Research 和 Web 搜索功能使用的默认搜索引擎
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key 配置</CardTitle>
          <CardDescription>
            配置各个搜索服务的 API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tavily API Key */}
          <div className="space-y-2">
            <Label htmlFor="tavilyApiKey" className="flex items-center gap-2">
              Tavily API Key
              {hasTavilyApiKey && (
                <span className="text-sm text-green-600">
                  <Check className="inline h-3 w-3" /> 已配置
                </span>
              )}
            </Label>
            <Input
              id="tavilyApiKey"
              type="password"
              placeholder={hasTavilyApiKey ? "留空保持不变" : "输入 Tavily API Key"}
              value={tavilyApiKey}
              onChange={(e) => setTavilyApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              用于 Tavily 搜索服务。获取 API Key: <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://tavily.com</a>
            </p>
          </div>

          {/* Jina API Key */}
          <div className="space-y-2">
            <Label htmlFor="jinaApiKey" className="flex items-center gap-2">
              Jina API Key
              {hasJinaApiKey && (
                <span className="text-sm text-green-600">
                  <Check className="inline h-3 w-3" /> 已配置
                </span>
              )}
            </Label>
            <Input
              id="jinaApiKey"
              type="password"
              placeholder={hasJinaApiKey ? "留空保持不变" : "输入 Jina API Key"}
              value={jinaApiKey}
              onChange={(e) => setJinaApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              用于 Jina 搜索和 Reader 服务。获取 API Key: <a href="https://jina.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://jina.ai</a>
            </p>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md px-3 py-2 mt-2">
              ⚠️ 注意：Deep Research（深度研究）功能需要 Jina API Key 才能正常工作
            </p>
          </div>

          {/* NCBI API Key */}
          <div className="space-y-2">
            <Label htmlFor="ncbiApiKey" className="flex items-center gap-2">
              NCBI API Key (可选)
              {hasNcbiApiKey && (
                <span className="text-sm text-green-600">
                  <Check className="inline h-3 w-3" /> 已配置
                </span>
              )}
            </Label>
            <Input
              id="ncbiApiKey"
              type="password"
              placeholder={hasNcbiApiKey ? "留空保持不变" : "输入 NCBI API Key"}
              value={ncbiApiKey}
              onChange={(e) => setNcbiApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              用于 PubMed/NCBI 搜索。可选配置，不配置也可使用但可能有请求频率限制。
              获取 API Key: <a href="https://www.ncbi.nlm.nih.gov/account/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NCBI Account</a>
            </p>
          </div>

          {/* 嵌入服务配置 */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">嵌入服务配置</h3>
            <p className="text-xs text-muted-foreground mb-4">
              配置用于生成文档向量嵌入的服务（用于知识库搜索）
            </p>

            {/* 嵌入服务提供商 */}
            <div className="space-y-2">
              <Label htmlFor="embeddingProvider">嵌入服务提供商</Label>
              <Select value={embeddingProvider} onValueChange={(v) => setEmbeddingProvider(v as EmbeddingProvider)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择嵌入服务" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI 兼容</SelectItem>
                  <SelectItem value="volcengine">火山引擎</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 嵌入服务 API Key */}
            <div className="space-y-2">
              <Label htmlFor="embeddingApiKey" className="flex items-center gap-2">
                嵌入服务 API Key
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
                  ? '火山引擎 ARK API Key，用于生成文档向量嵌入'
                  : 'OpenAI 或兼容服务的 API Key，用于生成文档向量嵌入'}
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
                  ? '火山引擎模型 ID（例如：ep-xxx）'
                  : 'OpenAI 嵌入模型名称（例如：text-embedding-3-small）'}
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
                自定义 API 端点，留空使用默认值
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
                value={embeddingDimension}
                onChange={(e) => setEmbeddingDimension(parseInt(e.target.value) || 1536)}
              />
              <p className="text-xs text-muted-foreground">
                嵌入向量的维度（text-embedding-3-small 为 1536，text-embedding-3-large 为 3072）
              </p>
            </div>
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

      {/* 提示信息 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium">配置说明：</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Jina API Key 是 Deep Research（深度研究）功能的必需配置</li>
                <li>Tavily 可作为备选搜索引擎使用</li>
                <li>NCBI API Key 用于 PubMed 文献搜索，可选配置</li>
                <li>嵌入服务用于生成文档向量，支持 OpenAI 兼容服务和火山引擎</li>
                <li>所有 API Key 会被加密存储在数据库中</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

