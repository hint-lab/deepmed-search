'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { hash } from 'bcryptjs';
import { withAuth } from '@/lib/auth-utils';
import { Session } from 'next-auth';
import { encryptApiKey, decryptApiKey } from '@/lib/crypto';
import { LLMConfig, UserLLMConfigList, CreateLLMConfigParams, UpdateLLMConfigParams } from '@/types/user';
import { SearchConfig as ISearchConfig, UpdateSearchConfigParams, DocumentParser } from '@/types/search';
import { ProviderFactory, ProviderType } from '@/lib/llm-provider';

/**
 * 获取用户信息
 */
export const getUserInfo = withAuth(async (session: Session) => {
    if (!session.user?.email) {
        return { success: false, error: '用户邮箱不存在' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            tenant: true,
        },
    });

    if (!user) {
        return { success: false, error: '用户不存在' };
    }

    return { success: true, data: user };
});

/**
 * 更新用户设置
 */
export const updateUserSettings = withAuth(async (session: Session, data: {
    language?: string;
    new_password?: string;
}) => {
    if (!session.user?.email) {
        return { success: false, error: '用户邮箱不存在' };
    }

    const updateData: any = {};
    if (data.language) {
        updateData.language = data.language;
    }
    if (data.new_password) {
        updateData.password = await hash(data.new_password, 10);
    }

    const user = await prisma.user.update({
        where: { email: session.user.email },
        data: updateData,
    });

    revalidatePath('/user-settings');
    return { success: true, data: user };
});

/**
 * 获取租户信息
 */
export const getTenantInfo = withAuth(async (session: Session) => {
    if (!session.user?.email) {
        return { success: false, error: '用户邮箱不存在' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            tenant: true,
        },
    });

    if (!user?.tenant) {
        return { success: false, error: '租户不存在' };
    }

    return { success: true, data: user.tenant };
});

/**
 * 获取系统状态
 */
export const getSystemStatus = async () => {
    try {
        const status = await prisma.systemStatus.findFirst();
        return { success: true, data: status };
    } catch (error) {
        console.error('获取系统状态失败:', error);
        return { success: false, error: '获取系统状态失败' };
    }
};

/**
 * 获取系统版本
 */
export const getSystemVersion = async () => {
    try {
        const version = process.env.NEXT_PUBLIC_VERSION || '1.0.0';
        return { success: true, data: version };
    } catch (error) {
        console.error('获取系统版本失败:', error);
        return { success: false, error: '获取系统版本失败' };
    }
};

/**
 * 获取系统令牌列表
 */
export const getSystemTokenList = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const tokens = await prisma.systemToken.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return { success: true, data: tokens };
});

/**
 * 创建系统令牌
 */
export const createSystemToken = withAuth(async (session: Session, params: { name: string }) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const token = await prisma.systemToken.create({
        data: {
            name: params.name,
            token: Math.random().toString(36).substring(2),
            userId: session.user.id,
        },
    });

    revalidatePath('/user-settings');
    return { success: true, data: token };
});

/**
 * 删除系统令牌
 */
export const removeSystemToken = withAuth(async (session: Session, token: string) => {
    await prisma.systemToken.delete({
        where: {
            id: token,
        },
    });

    revalidatePath('/user-settings');
    return { success: true };
});

/**
 * 获取用户的所有 LLM 配置
 * 返回配置列表，但不返回解密的 API Key
 */
export const getUserLLMConfigs = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        const configs = await prisma.lLMConfig.findMany({
            where: { userId: session.user.id },
            orderBy: [
                { isActive: 'desc' }, // 激活的配置排在前面
                { createdAt: 'desc' }
            ],
            select: {
                id: true,
                name: true,
                provider: true,
                model: true,
                reasonModel: true,
                baseUrl: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const formattedConfigs: LLMConfig[] = configs.map(config => ({
            ...config,
            provider: config.provider as 'deepseek' | 'openai' | 'google',
            model: config.model || undefined,
            reasonModel: config.reasonModel || undefined,
            baseUrl: config.baseUrl || undefined,
        }));

        const activeConfig = formattedConfigs.find(c => c.isActive);

        const result: UserLLMConfigList = {
            configs: formattedConfigs,
            activeConfig,
        };

        return { success: true, data: result };
    } catch (error) {
        console.error('获取用户 LLM 配置失败:', error);
        return { success: false, error: '获取配置失败' };
    }
});

/**
 * 创建新的 LLM 配置
 * API Key 会被加密后存储
 */
export const createLLMConfig = withAuth(async (session: Session, params: CreateLLMConfigParams) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 验证必填字段
        if (!params.name || !params.provider || !params.apiKey) {
            return { success: false, error: '名称、提供商和API Key是必填项' };
        }

        // 加密 API Key
        const encryptedApiKey = encryptApiKey(params.apiKey);

        // 如果是第一个配置，自动设为激活
        const existingCount = await prisma.lLMConfig.count({
            where: { userId: session.user.id }
        });

        const isActive = existingCount === 0;

        // 创建新配置
        const config = await prisma.lLMConfig.create({
            data: {
                name: params.name,
                provider: params.provider,
                apiKey: encryptedApiKey,
                model: params.model || null,
                reasonModel: params.reasonModel || null,
                baseUrl: params.baseUrl || null,
                isActive,
                userId: session.user.id,
            },
        });

        revalidatePath('/settings/llm');
        return { success: true, message: '配置已创建', data: { id: config.id } };
    } catch (error) {
        console.error('创建 LLM 配置失败:', error);
        return { success: false, error: '创建配置失败' };
    }
});

/**
 * 更新 LLM 配置
 * 如果提供 API Key，会被重新加密
 */
export const updateLLMConfig = withAuth(async (session: Session, params: UpdateLLMConfigParams) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 验证配置属于当前用户
        const existingConfig = await prisma.lLMConfig.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            },
        });

        if (!existingConfig) {
            return { success: false, error: '配置不存在或无权访问' };
        }

        // 准备更新数据
        const updateData: any = {};
        if (params.name !== undefined) updateData.name = params.name;
        if (params.model !== undefined) updateData.model = params.model || null;
        if (params.reasonModel !== undefined) updateData.reasonModel = params.reasonModel || null;
        if (params.baseUrl !== undefined) updateData.baseUrl = params.baseUrl || null;
        if (params.apiKey) {
            updateData.apiKey = encryptApiKey(params.apiKey);
        }

        // 更新配置
        await prisma.lLMConfig.update({
            where: { id: params.id },
            data: updateData,
        });

        revalidatePath('/settings/llm');
        return { success: true, message: '配置已更新' };
    } catch (error) {
        console.error('更新 LLM 配置失败:', error);
        return { success: false, error: '更新配置失败' };
    }
});

/**
 * 删除 LLM 配置
 */
export const deleteLLMConfig = withAuth(async (session: Session, configId: string) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 验证配置属于当前用户
        const existingConfig = await prisma.lLMConfig.findFirst({
            where: {
                id: configId,
                userId: session.user.id,
            },
        });

        if (!existingConfig) {
            return { success: false, error: '配置不存在或无权访问' };
        }

        // 删除配置
        await prisma.lLMConfig.delete({
            where: { id: configId },
        });

        // 如果删除的是激活的配置，激活第一个配置
        if (existingConfig.isActive) {
            const firstConfig = await prisma.lLMConfig.findFirst({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'asc' },
            });

            if (firstConfig) {
                await prisma.lLMConfig.update({
                    where: { id: firstConfig.id },
                    data: { isActive: true },
                });
            }
        }

        revalidatePath('/settings/llm');
        return { success: true, message: '配置已删除' };
    } catch (error) {
        console.error('删除 LLM 配置失败:', error);
        return { success: false, error: '删除配置失败' };
    }
});

/**
 * 激活指定的 LLM 配置
 * 会将其他配置设为非激活状态
 */
export const activateLLMConfig = withAuth(async (session: Session, configId: string) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 验证配置属于当前用户
        const existingConfig = await prisma.lLMConfig.findFirst({
            where: {
                id: configId,
                userId: session.user.id,
            },
        });

        if (!existingConfig) {
            return { success: false, error: '配置不存在或无权访问' };
        }

        // 使用事务确保原子性
        await prisma.$transaction([
            // 将所有配置设为非激活
            prisma.lLMConfig.updateMany({
                where: { userId: session.user.id },
                data: { isActive: false },
            }),
            // 激活指定配置
            prisma.lLMConfig.update({
                where: { id: configId },
                data: { isActive: true },
            }),
        ]);

        revalidatePath('/settings/llm');
        return { success: true, message: '配置已激活' };
    } catch (error) {
        console.error('激活 LLM 配置失败:', error);
        return { success: false, error: '激活配置失败' };
    }
});

/**
 * 测试 LLM 配置
 * 验证 API Key 是否有效
 */
export const testLLMConfig = withAuth(async (session: Session, params: CreateLLMConfigParams) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 验证必填字段
        if (!params.provider || !params.apiKey) {
            return { success: false, error: '提供商和API Key是必填项' };
        }

        // 根据提供商创建对应的 Provider 实例
        let provider;
        const testDialogId = `test-${session.user.id}-${Date.now()}`;

        switch (params.provider) {
            case 'deepseek':
                provider = ProviderFactory.createDeepSeek({
                    apiKey: params.apiKey,
                    baseUrl: params.baseUrl,
                    model: params.model || 'deepseek-chat',
                    reasonModel: params.reasonModel,
                });
                break;
            case 'openai':
                provider = ProviderFactory.createOpenAI({
                    apiKey: params.apiKey,
                    baseUrl: params.baseUrl,
                    model: params.model || 'gpt-4o-mini',
                });
                break;
            case 'google':
                provider = ProviderFactory.createGoogle({
                    apiKey: params.apiKey,
                    baseUrl: params.baseUrl,
                    model: params.model || 'gemini-2.0-flash-exp',
                });
                break;
            default:
                return { success: false, error: '不支持的提供商' };
        }

        // 发送测试消息
        const response = await provider.chat({
            dialogId: testDialogId,
            input: 'Hi, this is a test message. Please respond with OK.',
        });

        if (response.content) {
            return { success: true, message: 'API Key 验证成功！' };
        } else {
            return { success: false, error: 'API 响应为空' };
        }
    } catch (error) {
        console.error('测试 LLM 配置失败:', error);
        const errorMessage = error instanceof Error ? error.message : '验证失败';
        return { success: false, error: `API Key 验证失败: ${errorMessage}` };
    }
});

/**
 * 获取用户搜索配置
 */
export const getUserSearchConfig = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        let config = await prisma.searchConfig.findUnique({
            where: { userId: session.user.id },
        });

        // 如果不存在，创建默认配置
        if (!config) {
            config = await prisma.searchConfig.create({
                data: {
                    userId: session.user.id,
                    searchProvider: 'jina',
                    documentParser: 'markitdown-docker',
                },
            });
        }

        const result: ISearchConfig = {
            id: config.id,
            searchProvider: config.searchProvider as 'tavily' | 'jina',
            documentParser: config.documentParser as DocumentParser,
            hasTavilyApiKey: !!config.tavilyApiKey,
            hasJinaApiKey: !!config.jinaApiKey,
            hasNcbiApiKey: !!config.ncbiApiKey,
            hasMineruApiKey: !!config.mineruApiKey,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };

        return { success: true, data: result };
    } catch (error) {
        console.error('获取搜索配置失败:', error);
        return { success: false, error: '获取配置失败' };
    }
});

/**
 * 更新用户搜索配置
 */
export const updateUserSearchConfig = withAuth(async (session: Session, params: UpdateSearchConfigParams) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 准备更新数据
        const updateData: any = {};

        if (params.tavilyApiKey !== undefined) {
            updateData.tavilyApiKey = params.tavilyApiKey ? encryptApiKey(params.tavilyApiKey) : null;
        }
        if (params.jinaApiKey !== undefined) {
            updateData.jinaApiKey = params.jinaApiKey ? encryptApiKey(params.jinaApiKey) : null;
        }
        if (params.ncbiApiKey !== undefined) {
            updateData.ncbiApiKey = params.ncbiApiKey ? encryptApiKey(params.ncbiApiKey) : null;
        }
        if (params.mineruApiKey !== undefined) {
            updateData.mineruApiKey = params.mineruApiKey ? encryptApiKey(params.mineruApiKey) : null;
        }
        if (params.searchProvider !== undefined) {
            updateData.searchProvider = params.searchProvider;
        }
        if (params.documentParser !== undefined) {
            updateData.documentParser = params.documentParser;
        }

        // 查找或创建配置
        const existingConfig = await prisma.searchConfig.findUnique({
            where: { userId: session.user.id },
        });

        if (existingConfig) {
            await prisma.searchConfig.update({
                where: { userId: session.user.id },
                data: updateData,
            });
        } else {
            await prisma.searchConfig.create({
                data: {
                    ...updateData,
                    userId: session.user.id,
                },
            });
        }

        revalidatePath('/settings/search');
        return { success: true, message: '搜索配置已更新' };
    } catch (error) {
        console.error('更新搜索配置失败:', error);
        return { success: false, error: '更新配置失败' };
    }
});
