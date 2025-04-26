# Internationalization (i18n) in Eleva Care App

This guide explains how to use internationalization in the Eleva Care app with Next.js 15.3 and next-intl.

## Directory Structure

Our app follows a locale-based structure:

```
app/
  [locale]/              # Dynamic locale segment
    layout.tsx           # Root layout with NextIntlClientProvider
    page.tsx             # Root page for each locale
    (public)/            # Public section within each locale
      layout.tsx
      page.tsx
      about/
        page.tsx
      legal/
        layout.tsx
        page.tsx
    (private)/           # Private/authenticated section
      layout.tsx
      dashboard/
        page.tsx
      # ...
    (auth)/              # Auth section
      layout.tsx
      # ...
```

## Key Components

1. **Routing Configuration**

   - Defined in `i18n/routing.ts`
   - Uses `defineRouting` from next-intl

2. **Navigation Utilities**

   - Defined in `i18n/navigation.ts`
   - Provides localized `Link`, `redirect`, and other navigation helpers

3. **Middleware**
   - Configured in `middleware.ts`
   - Combines next-intl with Clerk for authentication

## Translation Usage

### Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('MyNamespace');

  return <h1>{t('title')}</h1>;
}
```

### Server Components

```tsx
import { useTranslations } from 'next-intl';

export default function MyServerComponent() {
  const t = useTranslations('MyNamespace');

  return <h1>{t('title')}</h1>;
}
```

### Redirecting

```tsx
import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';

export default async function MyPage() {
  const locale = await getLocale();

  // Redirect while preserving locale
  redirect('/dashboard');
}
```

### Link Component

```tsx
import { Link } from '@/i18n/navigation';

export default function MyComponent() {
  return <Link href="/about">About Us</Link>;
}
```

## Translation Files

Translation files are located in the `messages/` directory:

- `messages/en.json` - English translations
- `messages/es.json` - Spanish translations
- `messages/pt.json` - Portuguese translations
- `messages/br.json` - Brazilian Portuguese translations

## Adding a New Page

1. Create the page file in all locale directories
2. Add translations to all message files
3. Use the appropriate translation keys in your components

## Using with Clerk Authentication

The middleware handles both internationalization and authentication:

1. next-intl middleware processes locale routing
2. Clerk middleware handles authentication, using the response from next-intl

This ensures proper locale preservation during authentication flows.

## Debug Checklist

If you're experiencing issues with internationalization:

1. Check that the locale segment is included in the URL
2. Ensure translations exist in the appropriate message file
3. Verify that components are using the correct translation namespace
4. Check that navigation is using the `Link` component from `@/i18n/navigation`
5. Use `getLocale()` in server components when redirecting
