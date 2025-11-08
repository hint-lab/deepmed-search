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

            </div>
        </footer>
    );
}

