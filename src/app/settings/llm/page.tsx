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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, AlertCircle, Plus, Trash2, Edit, Power, TestTube } from 'lucide-react';
import {
  getUserLLMConfigs,
  createLLMConfig,
  updateLLMConfig,
  deleteLLMConfig,
  activateLLMConfig,
  testLLMConfig,
} from '@/actions/user';
import { LLMConfig, CreateLLMConfigParams, UpdateLLMConfigParams } from '@/types/user';

// 模型选项配置
const PROVIDER_OPTIONS = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google (Gemini)' },
] as const;

const MODEL_OPTIONS = {
  deepseek: [
    { value: 'deepseek-chat', label: 'deepseek-chat' },
    { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-5-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  google: [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 1.5 Flash' },
  ],
};

const DEFAULT_BASE_URLS = {
  deepseek: 'https://api.deepseek.com',
  openai: 'https://api.openai.com/v1',
  google: '',
};

export default function LLMSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<LLMConfig | undefined>();
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  
  // 表单状态
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'deepseek' | 'openai' | 'google'>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [reasonModel, setReasonModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const result = await getUserLLMConfigs();
      if (result.success && result.data) {
        setConfigs(result.data.configs);
        setActiveConfig(result.data.activeConfig);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadConfigs();
    }
  }, [session]);

  // 打开创建对话框
  const handleCreate = () => {
    setDialogMode('create');
    setEditingConfig(null);
    setName('');
    setProvider('deepseek');
    setApiKey('');
    setModel('');
    setReasonModel('');
    setBaseUrl(DEFAULT_BASE_URLS.deepseek);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (config: LLMConfig) => {
    setDialogMode('edit');
    setEditingConfig(config);
    setName(config.name);
    setProvider(config.provider);
    setApiKey(''); // 不显示现有 API Key
    setModel(config.model || '');
    setReasonModel(config.reasonModel || '');
    setBaseUrl(config.baseUrl || DEFAULT_BASE_URLS[config.provider]);
    setDialogOpen(true);
  };

  // 当提供商改变时，更新相关字段
  useEffect(() => {
    if (dialogMode === 'create') {
      setBaseUrl(DEFAULT_BASE_URLS[provider]);
      setModel('');
      setReasonModel('');
    }
  }, [provider, dialogMode]);

  // 测试连接
  const handleTest = async () => {
    if (!apiKey) {
      toast.error('请输入 API Key');
      return;
    }

    setTesting(true);
    try {
      const params: CreateLLMConfigParams = {
        name: name || 'test',
        provider,
        apiKey,
        model: model || undefined,
        reasonModel: reasonModel || undefined,
        baseUrl: baseUrl || undefined,
      };

      const result = await testLLMConfig(params);
      if (result.success) {
        toast.success('API Key 验证成功！');
      } else {
        toast.error(result.error || '验证失败');
      }
    } catch (error) {
      toast.error('测试连接失败');
    } finally {
      setTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入配置名称');
      return;
    }

    if (dialogMode === 'create' && !apiKey) {
      toast.error('请输入 API Key');
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === 'create') {
        const params: CreateLLMConfigParams = {
          name,
          provider,
          apiKey,
          model: model || undefined,
          reasonModel: reasonModel || undefined,
          baseUrl: baseUrl || undefined,
        };

        const result = await createLLMConfig(params);
        if (result.success) {
          toast.success('配置已创建');
          setDialogOpen(false);
          await loadConfigs();
        } else {
          toast.error(result.error || '创建失败');
        }
      } else {
        const params: UpdateLLMConfigParams = {
          id: editingConfig!.id,
          name,
          model: model || undefined,
          reasonModel: reasonModel || undefined,
          baseUrl: baseUrl || undefined,
          apiKey: apiKey || undefined, // 如果没有输入新的，则不更新
        };

        const result = await updateLLMConfig(params);
        if (result.success) {
          toast.success('配置已更新');
          setDialogOpen(false);
          await loadConfigs();
        } else {
          toast.error(result.error || '更新失败');
        }
      }
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除配置
  const handleDelete = async (configId: string) => {
    if (!confirm('确定要删除这个配置吗？')) {
      return;
    }

    setDeleting(configId);
    try {
      const result = await deleteLLMConfig(configId);
      if (result.success) {
        toast.success('配置已删除');
        await loadConfigs();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除配置失败');
    } finally {
      setDeleting(null);
    }
  };

  // 激活配置
  const handleActivate = async (configId: string) => {
    setActivating(configId);
    try {
      const result = await activateLLMConfig(configId);
      if (result.success) {
        toast.success('配置已激活');
        await loadConfigs();
      } else {
        toast.error(result.error || '激活失败');
      }
    } catch (error) {
      toast.error('激活配置失败');
    } finally {
      setActivating(null);
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM 配置</h1>
          <p className="text-muted-foreground mt-2">
            管理您的 LLM 配置，可以添加多个配置并切换使用。
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建配置
        </Button>
      </div>

      {/* 配置列表 */}
      <div className="grid gap-4">
        {configs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                您还没有任何 LLM 配置
              </p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                创建第一个配置
              </Button>
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => (
            <Card key={config.id} className={config.isActive ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      {config.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                          <Check className="mr-1 h-3 w-3" />
                          激活中
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {PROVIDER_OPTIONS.find(p => p.value === config.provider)?.label}
                      {config.model && ` • ${config.model}`}
                      {' • 创建于 ' + new Date(config.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!config.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(config.id)}
                        disabled={!!activating}
                      >
                        {activating === config.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            激活中...
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            激活
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                      disabled={!!deleting}
                    >
                      {deleting === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* 提示信息 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium">使用说明：</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>您可以创建多个 LLM 配置</li>
                <li>只有激活的配置会被使用</li>
                <li>点击"激活"按钮可切换配置</li>
                <li>API Key 会被加密存储，确保安全</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? '新建 LLM 配置' : '编辑 LLM 配置'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? '创建一个新的 LLM 配置'
                : '修改 LLM 配置信息'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 配置名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">配置名称 *</Label>
              <Input
                id="name"
                placeholder="例如：工作账号、个人账号"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 提供商选择 */}
            <div className="space-y-2">
              <Label htmlFor="provider">提供商 *</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as any)}
                disabled={dialogMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dialogMode === 'edit' && (
                <p className="text-xs text-muted-foreground">
                  提供商不可修改
                </p>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key {dialogMode === 'create' ? '*' : '(可选)'}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={
                  dialogMode === 'edit'
                    ? '留空保持不变'
                    : '输入 API Key'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {dialogMode === 'edit'
                  ? '仅在需要更新 API Key 时填写'
                  : 'API Key 将被加密存储'}
              </p>
            </div>

            {/* 模型选择 */}
            <div className="space-y-2">
              <Label htmlFor="model">模型（可选）</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS[provider].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DeepSeek 推理模型 */}
            {provider === 'deepseek' && (
              <div className="space-y-2">
                <Label htmlFor="reasonModel">推理模型（可选）</Label>
                <Input
                  id="reasonModel"
                  placeholder="deepseek-reasoner"
                  value={reasonModel}
                  onChange={(e) => setReasonModel(e.target.value)}
                />
              </div>
            )}

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL（可选）</Label>
              <Input
                id="baseUrl"
                placeholder={DEFAULT_BASE_URLS[provider]}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !apiKey}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  测试连接
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
