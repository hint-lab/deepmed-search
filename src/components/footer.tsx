'use client';

import Link from 'next/link';
import { Trans } from 'react-i18next';
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
                        <Trans
                            i18nKey="footer.developedBy"
                            values={{ organization: 'H!NT Lab' }}
                            components={{
                                link: (
                                    <Link
                                        href="https://hint-lab.github.io/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-foreground hover:text-primary transition-colors underline decoration-primary/30 hover:decoration-primary"
                                    />
                                )
                            }}
                        />
                    </div>
                </div>

            </div>
        </footer>
    );
}

