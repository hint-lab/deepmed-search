'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
    Search, 
    Brain, 
    BookOpen, 
    Database,
    ArrowRight,
    CheckCircle2,
    TrendingUp,
    Clock,
    Shield,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/contexts/language-context';
import Footer from '@/components/footer';

export default function Home() {
    const router = useRouter();
    const { t } = useTranslate('home');
    
    return (
        <main className="flex min-h-screen flex-col bg-background text-foreground overflow-y-auto pt-14">
            {/* Hero Section - Clean and Professional */}
            <section className="relative py-20 md:py-32 border-b">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-6">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                            {t('badge')}
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            <span className="text-foreground">{t('title')}</span>
                            <br />
                            <span className="text-cyan-600 dark:text-cyan-400">{t('subtitle')}</span>
                        </h1>
                        
                        <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl">
                            {t('description')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-12">
                            <Button
                                size="lg"
                                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                                onClick={() => router.push('/login')}
                            >
                                {t('getStarted')}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => router.push('/search')}
                            >
                                {t('quickSearch')}
                                <Search className="ml-2 w-4 h-4" />
                            </Button>
                        </div>

                        {/* Key metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t">
                            {['pubmed', 'speed', 'accuracy', 'formats'].map((key) => (
                                <div key={key}>
                                    <div className="text-2xl font-bold text-foreground">{t(`metrics.${key}.value`)}</div>
                                    <div className="text-sm text-muted-foreground">{t(`metrics.${key}.label`)}</div>
                                    <div className="text-xs text-muted-foreground">{t(`metrics.${key}.sublabel`)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features - Four Pillars */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">{t('features.title')}</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            {t('features.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                        {[
                            {
                                icon: Search,
                                key: 'webSearch',
                                href: '/search',
                                color: 'cyan'
                            },
                            {
                                icon: BookOpen,
                                key: 'pubmedSearch',
                                href: '/pubmed',
                                color: 'blue'
                            },
                            {
                                icon: Brain,
                                key: 'deepResearch',
                                href: '/research',
                                color: 'emerald'
                            },
                            {
                                icon: Database,
                                key: 'knowledgeBase',
                                href: '/knowledgebase',
                                color: 'purple'
                            },
                        ].map((feature, i) => (
                            <Link key={i} href={feature.href} className="group block">
                                <Card className="h-full border-2 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all hover:shadow-lg">
                                    <CardHeader>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-lg bg-${feature.color}-50 dark:bg-${feature.color}-950/50 border border-${feature.color}-200 dark:border-${feature.color}-800`}>
                                                <feature.icon className={`w-6 h-6 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                                {t(`features.${feature.key}.stats`)}
                                            </span>
                                        </div>
                                        <CardTitle className="text-xl mb-1">{t(`features.${feature.key}.title`)}</CardTitle>
                                        <div className="text-sm text-muted-foreground mb-3">{t(`features.${feature.key}.subtitle`)}</div>
                                        <CardDescription className="text-sm leading-relaxed mb-4">
                                            {t(`features.${feature.key}.description`)}
                                        </CardDescription>
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3].map((num) => (
                                                <span key={num} className="inline-flex items-center text-xs px-2 py-1 rounded bg-muted">
                                                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                                                    {t(`features.${feature.key}.feature${num}`)}
                                                </span>
                                            ))}
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Use Cases - Real scenarios */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">{t('useCases.title')}</h2>
                        <p className="text-lg text-muted-foreground">
                            {t('useCases.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {[
                            { key: 'clinical', icon: TrendingUp },
                            { key: 'drugDevelopment', icon: Zap },
                            { key: 'review', icon: Clock },
                        ].map((useCase, i) => (
                            <Card key={i} className="border">
                                <CardHeader>
                                    <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center mb-4">
                                        <useCase.icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                    <CardTitle className="text-lg mb-2">{t(`useCases.${useCase.key}.title`)}</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed mb-4">
                                        {t(`useCases.${useCase.key}.description`)}
                                    </CardDescription>
                                    <div className="inline-flex items-center text-sm font-medium text-cyan-600 dark:text-cyan-400">
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        {t(`useCases.${useCase.key}.result`)}
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Technical highlights */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold mb-8 text-center">{t('technical.title')}</h2>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            {[
                                { icon: Shield, key: 'security' },
                                { icon: Zap, key: 'performance' },
                                { icon: Brain, key: 'ai' },
                                { icon: Database, key: 'integration' },
                            ].map((tech, i) => (
                                <Card key={i} className="border">
                                    <CardHeader>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/50">
                                                <tech.icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                            </div>
                                            <CardTitle className="text-lg">{t(`technical.${tech.key}.title`)}</CardTitle>
                                        </div>
                                        <ul className="space-y-2">
                                            {[1, 2, 3, 4].map((num) => (
                                                <li key={num} className="flex items-start text-sm text-muted-foreground">
                                                    <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                                                    <span>{t(`technical.${tech.key}.point${num}`)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            {t('cta.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                size="lg"
                                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                                onClick={() => router.push('/register')}
                            >
                                {t('cta.register')}
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => router.push('/login')}
                            >
                                {t('cta.login')}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-6">
                            {t('cta.contact')}
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
