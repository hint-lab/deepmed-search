import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Copyright */}
                    <div className="text-sm text-muted-foreground text-center md:text-left">
                        © {currentYear} DeepMed Search. All rights reserved.
                    </div>

                    {/* H!NT Lab Link */}
                    <div className="text-sm text-muted-foreground text-center md:text-right">
                        Developed by{' '}
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
                            关于我们
                        </Link>
                        <Link href="/privacy" className="hover:text-foreground transition-colors">
                            隐私政策
                        </Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">
                            使用条款
                        </Link>
                        <Link href="/contact" className="hover:text-foreground transition-colors">
                            联系我们
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

