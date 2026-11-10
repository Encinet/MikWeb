import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Keep navigation out of the configuration imported by Proxy and request config.
export const { Link, redirect, getPathname, usePathname, useRouter } = createNavigation(routing);
