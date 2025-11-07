'use client';

import Link from 'next/link';
import { useTranslate } from '@/contexts/language-context';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const { t } = useTranslate('footer');

    return (
        <footer className="w-full border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Copyright */}
                    <div className="text-sm text-muted-foreground text-center md:text-left">
                        © {currentYear} DeepMed Search. {t('copyright')}.
                    </div>

                    {/* H!NT Lab Link */}
                    <div className="text-sm text-muted-foreground text-center md:text-right">
                        {t('developedBy')}{' '}
                        <Link
                            href="https://hint-lab.github.io/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-primary transition-colors underline decoration-primary/30 hover:decoration-primary"
                        >
                            H!NT Lab
                        </Link>
                    </div>
                </div>

                {/* Optional: Additional Links */}
                <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                        <Link href="/about" className="hover:text-foreground transition-colors">
                            {t('about')}
                        </Link>
                        <Link href="/privacy" className="hover:text-foreground transition-colors">
                            {t('privacy')}
                        </Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">
                            {t('terms')}
                        </Link>
                        <Link href="/contact" className="hover:text-foreground transition-colors">
                            {t('contact')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

