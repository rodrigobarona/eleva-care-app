import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

// Create navigation functions with the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
