import type { Metadata } from 'next';
import { Geist, Fraunces } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { EuFooter } from '@/components/eu-footer';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  // 'cyrillic' subset added for Ukrainian.
  subsets: ['latin', 'latin-ext', 'cyrillic'],
});

// Editorial serif for hero + manifest. Variable font — wide weight range.
const fraunces = Fraunces({
  variable: '--font-serif',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Common' });

  return {
    title: {
      default: t('appName'),
      template: `%s · ${t('appName')}`,
    },
    description: t('appTagline'),
    applicationName: t('appName'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fgst.vercel.app'),
  };
}

export const viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  // Allow user to zoom — important for accessibility (seniors).
  maximumScale: 5,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full flex flex-col">
        {/* Scroll progress bar — pure CSS, animation-timeline: scroll(root) */}
        <div
          className="scroll-progress-bar fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand via-emerald-500 to-accent z-50 origin-left"
          aria-hidden
        />
        <NextIntlClientProvider>
          <div className="flex-1 flex flex-col relative z-10">{children}</div>
          <EuFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
