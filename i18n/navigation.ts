import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

// Create shared navigation functions for consistent client and server navigation
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
