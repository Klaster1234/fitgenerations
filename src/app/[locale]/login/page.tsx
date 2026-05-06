import { LogIn } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AuthHeader } from '@/components/auth-header';
import { Link } from '@/i18n/navigation';
import { LoginForm } from './login-form';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Auth');

  return (
    <div className="bg-hero-gradient flex-1 flex flex-col">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light text-brand mb-5 shadow-soft">
              <LogIn className="w-7 h-7" strokeWidth={2.25} aria-hidden />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('loginTitle')}
            </h1>
          </div>

          <Card className="shadow-card border-border/60">
            <CardContent className="p-8">
              <LoginForm />
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted">
            {t('noAccount')}{' '}
            <Link
              href="/signup"
              className="font-semibold text-brand hover:text-brand-dark underline underline-offset-2"
            >
              {t('signupLink')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
