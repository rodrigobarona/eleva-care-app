import createMiddleware from 'next-intl/middleware';

import { routing } from './routing';

// Create standalone middleware for i18n
export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - If they start with `/api`, `/_next`, `/img`
  // - Those containing a dot (e.g. favicon.ico)
  matcher: ['/((?!api|_next|img|.*\\.).*)'],
};
