'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Zap, BarChart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function Home() {
    const router = useRouter();
    const { t } = useTranslation('translation', { keyPrefix: 'home' });

    return (
        <main className="flex min-h-screen flex-col bg-slate-900 text-white">
            {/* Hero Section */}
            <section className="relative flex-1 flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10"></div>
                <div className="relative z-10 px-4 py-32">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h1 className="text-4xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                            {t('title')}
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-300">
                            {t('subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                                onClick={() => router.push('/login')}
                            >
                                <span>{t('getStarted')}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                                onClick={() => router.push('/documents')}
                            >
                                <span>{t('viewDocs')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-slate-800 border-t border-slate-700">
                <div className="mx-auto container px-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 text-white">
                        {t('features.title')}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                        <Card className="bg-slate-700 border-slate-600 shadow-lg shadow-slate-900/30 hover:shadow-cyan-900/20 hover:border-cyan-700/50 transition-all duration-300">
                            <CardHeader>
                                <div className="w-12 h-12 bg-cyan-900/50 rounded-lg flex items-center justify-center mb-4 ring-1 ring-cyan-500/20">
                                    <FileText className="w-6 h-6 text-cyan-400" />
                                </div>
                                <CardTitle className="text-white">{t('features.documentProcessing.title')}</CardTitle>
                                <CardDescription className="text-slate-300">{t('features.documentProcessing.description')}</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-slate-700 border-slate-600 shadow-lg shadow-slate-900/30 hover:shadow-blue-900/20 hover:border-blue-700/50 transition-all duration-300">
                            <CardHeader>
                                <div className="w-12 h-12 bg-blue-900/50 rounded-lg flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
                                    <FileText className="w-6 h-6 text-blue-400" />
                                </div>
                                <CardTitle className="text-white">{t('features.documentQA.title')}</CardTitle>
                                <CardDescription className="text-slate-300">{t('features.documentQA.description')}</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-slate-700 border-slate-600 shadow-lg shadow-slate-900/30 hover:shadow-indigo-900/20 hover:border-indigo-700/50 transition-all duration-300">
                            <CardHeader>
                                <div className="w-12 h-12 bg-indigo-900/50 rounded-lg flex items-center justify-center mb-4 ring-1 ring-indigo-500/20">
                                    <Zap className="w-6 h-6 text-indigo-400" />
                                </div>
                                <CardTitle className="text-white">{t('features.quickConversion.title')}</CardTitle>
                                <CardDescription className="text-slate-300">{t('features.quickConversion.description')}</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-slate-700 border-slate-600 shadow-lg shadow-slate-900/30 hover:shadow-purple-900/20 hover:border-purple-700/50 transition-all duration-300">
                            <CardHeader>
                                <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mb-4 ring-1 ring-purple-500/20">
                                    <BarChart className="w-6 h-6 text-purple-400" />
                                </div>
                                <CardTitle className="text-white">{t('features.dataAnalysis.title')}</CardTitle>
                                <CardDescription className="text-slate-300">{t('features.dataAnalysis.description')}</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-slate-900 to-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:50px_50px]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10"></div>
                <div className="mx-auto container px-4 text-center relative z-10">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('cta.title')}</h2>
                        <p className="text-lg sm:text-xl text-slate-300">
                            {t('cta.subtitle')}
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white border-0"
                        >
                            <Link href="/register">
                                {t('cta.register')}
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}