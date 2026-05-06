import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Typed wrappers around Next.js navigation APIs that respect the configured locale.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
