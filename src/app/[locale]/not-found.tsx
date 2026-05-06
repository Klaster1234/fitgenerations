import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('Errors');

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="text-center">
        <p className="text-7xl font-bold text-brand">404</p>
        <h1 className="mt-4 text-2xl font-semibold">{t('notFound')}</h1>
        <Link
          href="/"
          className="mt-8 inline-flex items-center px-5 py-3 rounded-full bg-brand text-white font-semibold hover:bg-brand-dark transition-colors"
        >
          {t('notFoundBack')}
        </Link>
      </div>
    </main>
  );
}
