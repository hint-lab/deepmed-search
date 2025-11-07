'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Zap, BarChart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/contexts/language-context';
import Footer from '@/components/footer';

export default function Home() {
    const router = useRouter();
    const { t } = useTranslate('home');
    return (
        <main className="flex min-h-screen flex-col bg-background text-foreground overflow-y-auto pt-14">
            {/* Hero Section - Modern and Vibrant */}
            <section className="relative flex-1 flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-background">
                {/* Modern gradient backdrop */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb)/0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb)/0.15),transparent_50%)]"></div>

                {/* Animated gradient blobs */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

                {/* Fine grid overlay */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

                <div className="relative z-10 px-4 py-32">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h1 className="text-4xl sm:text-6xl font-bold">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 from-blue-600 via-purple-600 to-pink-600">
                                {t('title')}
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                            {t('subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                                onClick={() => router.push('/login')}
                            >
                                <span>{t('getStarted')}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto backdrop-blur-sm bg-white/10 dark:bg-black/10 border-purple-200 dark:border-purple-800 text-foreground hover:bg-white/20 dark:hover:bg-black/20"
                                onClick={() => router.push('/documents')}
                            >
                                <span>{t('viewDocs')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Enhanced with color */}
            <section className="py-20 bg-muted/20 border-t border-border relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>

                <div className="mx-auto container px-4 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
                        {t('features.title')}
                    </h2>
                    <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-12">
                        {t('features.subtitle')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            {
                                icon: FileText, titleKey: 'features.documentProcessing.title', descKey: 'features.documentProcessing.description',
                                colorClass: 'text-blue-600 dark:text-blue-400',
                                bgClass: 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900/50',
                                borderClass: 'border-blue-200 dark:border-blue-800'
                            },

                            {
                                icon: FileText, titleKey: 'features.documentQA.title', descKey: 'features.documentQA.description',
                                colorClass: 'text-emerald-600 dark:text-emerald-400',
                                bgClass: 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900/50',
                                borderClass: 'border-emerald-200 dark:border-emerald-800'
                            },

                            {
                                icon: Zap, titleKey: 'features.quickConversion.title', descKey: 'features.quickConversion.description',
                                colorClass: 'text-amber-600 dark:text-amber-400',
                                bgClass: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900/50',
                                borderClass: 'border-amber-200 dark:border-amber-800'
                            },

                            {
                                icon: BarChart, titleKey: 'features.dataAnalysis.title', descKey: 'features.dataAnalysis.description',
                                colorClass: 'text-purple-600 dark:text-purple-400',
                                bgClass: 'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950 dark:to-purple-900/50',
                                borderClass: 'border-purple-200 dark:border-purple-800'
                            },
                        ].map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={index} className={`bg-card/70 backdrop-blur-sm border ${feature.borderClass} shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}>
                                    <CardHeader className="p-6">
                                        <div className={`w-14 h-14 ${feature.bgClass} rounded-2xl flex items-center justify-center mb-5 shadow-sm`}>
                                            <Icon className={`w-7 h-7 ${feature.colorClass}`} />
                                        </div>
                                        <CardTitle className="text-xl">{t(feature.titleKey)}</CardTitle>
                                        <CardDescription className="text-base mt-2.5">{t(feature.descKey)}</CardDescription>
                                    </CardHeader>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section - More modern gradient */}
            <section className="py-24 relative overflow-hidden">
                {/* Modern gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50/5 dark:via-purple-900/5 to-blue-50/10 dark:to-blue-900/10"></div>

                {/* Decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-400/10 dark:bg-purple-900/20 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>

                <div className="mx-auto container px-4 text-center relative z-10">
                    <div className="max-w-2xl mx-auto space-y-8">
                        <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                            {t('cta.title')}
                        </h2>
                        <p className="text-lg sm:text-xl text-muted-foreground">
                            {t('cta.subtitle')}
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                        >
                            <Link href="/register">
                                {t('cta.register')}
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </main>
    );
}
