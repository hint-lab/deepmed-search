'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslate } from '@/contexts/language-context';
import { getUserInfo } from '@/actions/user';
import { useSession } from "next-auth/react"
import { toast } from 'sonner';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});




const LeftPanel = () => {
    const { t } = useTranslate('login');
    return (
        <div className="relative w-3/5 bg-gradient-to-b from-background via-background to-background">
            {/* Modern gradient backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb)/0.15),transparent_50%)]"></div>

            {/* Animated gradient blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

            {/* Fine grid overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <div className="relative flex flex-col items-center justify-center min-h-screen p-20 z-10">
                <div className="w-full max-w-2xl space-y-8">
                    <div className="space-y-4 text-center">
                        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 dark:from-cyan-400 dark:via-blue-400 dark:to-teal-400">
                                {t('title')}
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            {t('description')}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="relative p-6 rounded-lg bg-card/70 backdrop-blur-sm border border-cyan-200 dark:cyan-800 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute -top-3 -left-3">
                                <div className="h-6 w-6 rounded-full bg-blue-400/30 flex items-center justify-center">
                                    <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">{t('features.ai.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('features.ai.description')}</p>
                        </div>
                        <div className="relative p-6 rounded-lg bg-card/70 backdrop-blur-sm border border-cyan-200 dark:border-cyan-800 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute -top-3 -left-3">
                                <div className="h-6 w-6 rounded-full bg-cyan-400/30 flex items-center justify-center">
                                    <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="font-semibold mb-2 text-cyan-600 dark:text-cyan-400">{t('features.security.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('features.security.description')}</p>
                        </div>
                        <div className="relative p-6 rounded-lg bg-card/70 backdrop-blur-sm border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute -top-3 -left-3">
                                <div className="h-6 w-6 rounded-full bg-amber-400/30 flex items-center justify-center">
                                    <div className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="font-semibold mb-2 text-amber-600 dark:text-amber-400">{t('features.speed.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('features.speed.description')}</p>
                        </div>
                        <div className="relative p-6 rounded-lg bg-card/70 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute -top-3 -left-3">
                                <div className="h-6 w-6 rounded-full bg-emerald-400/30 flex items-center justify-center">
                                    <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="font-semibold mb-2 text-emerald-600 dark:text-emerald-400">{t('features.reliability.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('features.reliability.description')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Login = () => {
    const searchParams = useSearchParams();
    const { t } = useTranslate('login');
    const [loading, setLoading] = useState(false);
    // const { userInfo, isLoading, isAuthenticated, updateUserInfo, refreshUserInfo } = useUserInfoContext();
    const callbackUrl = searchParams.get('callbackUrl') || '/knowledgebase';
    const { data: session } = useSession();
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            console.error('Auth error:', error);
        }
    }, [searchParams]);

    // 如果已经登录，自动跳转
    useEffect(() => {
        if (session?.user) {
            window.location.href = callbackUrl;
        }
    }, [callbackUrl]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onLoginSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true);
            const result = await signIn('credentials', {
                email: values.email.trim(),
                password: values.password,
                redirect: false,
                callbackUrl
            });

            if (result?.error) {
                toast.error("登录失败", {
                    description: "邮箱或密码错误",
                });
                return;
            }

            // 登录成功后获取用户信息
            const response = await getUserInfo();
            const user = response.data;

            if (user) {
                // 将用户信息存储到 localStorage（可选）
                localStorage.setItem('userInfo', JSON.stringify({
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image
                }));
            }

            // 显示成功提示
            toast.success("登录成功", {
                description: `欢迎回来，${user?.name || user?.email || ''}！`,
            });

            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
            window.location.href = callbackUrl;
            }, 800);
        } catch (error) {
            console.error('登录失败:', error);
            toast.error("登录失败", {
                description: "服务器错误，请稍后重试",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl });
    };

    const handleGithubSignIn = () => {
        signIn('github', { callbackUrl });
    };

    // 检查用户是否已登录
    if (session?.user) {
        // 用户已登录
    }

    // 更新用户信息
    // updateUserInfo({ name: '新名字' });

    // 刷新用户信息
    // const refreshUserInfoHandler = async () => {
    //     await refreshUserInfo();
    // };

    return (
        <div className="flex min-h-screen">
            <LeftPanel />
            <div className="w-2/5 flex items-center justify-center p-8 bg-gradient-to-br from-background via-purple-50/5 dark:via-purple-900/5 to-blue-50/10 dark:to-blue-900/10 relative">
                {/* Decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-400/10 dark:bg-purple-900/20 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>

                <Card className="w-full max-w-md border relative z-10 backdrop-blur-sm bg-card/70 shadow-xl hover:shadow-lg transition-all duration-300">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 dark:from-cyan-400 dark:via-blue-400 dark:to-teal-400">{t('login')}</CardTitle>
                        <CardDescription className="text-base">
                            {t('loginDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <Button
                                variant="outline"
                                className="w-full relative h-11 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20 transition-all"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                            >
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {t('loginWithGoogle')}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full relative h-11 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
                                onClick={handleGithubSignIn}
                                disabled={loading}
                            >
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {t('loginWithGithub')}
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    {t('orContinueWith')}
                                </span>
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onLoginSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('emailLabel')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('emailPlaceholder')}
                                                    className="h-11 px-4 focus:border-purple-500 focus:ring-purple-500/20"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>{t('passwordLabel')}</FormLabel>
                                                <a
                                                    href="#"
                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline-offset-4 hover:underline"
                                                >
                                                    {t('forgotPassword')}
                                                </a>
                                            </div>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder={t('passwordPlaceholder')}
                                                    className="h-11 px-4 focus:border-purple-500 focus:ring-purple-500/20"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                                    disabled={loading}
                                >
                                    {t('login')}
                                </Button>
                            </form>
                        </Form>

                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">{t('noAccount')}</span>{" "}
                            <a href="/register" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline underline-offset-4">
                                {t('signUp')}
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Login;
