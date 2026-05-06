import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';
import { LocaleSwitcher } from './locale-switcher';

export async function AuthHeader() {
  const tc = await getTranslations('Common');

  return (
    <header className="relative z-20 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
      <Link href="/" className="hover:opacity-80 transition-opacity" aria-label={tc('appName')}>
        <Logo size="md" />
      </Link>

      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <Link
          href="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-pill text-sm font-semibold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {tc('back')}
        </Link>
      </div>
    </header>
  );
}
