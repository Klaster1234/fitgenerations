import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Typed Links and route props — catches broken Links at build time.
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
