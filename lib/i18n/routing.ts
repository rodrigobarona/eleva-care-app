import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'es', 'pt', 'br'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale = 'en' as const;

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Use a valid value: 'always', 'as-needed', or 'never'
  localePrefix: 'as-needed',
  pathnames: {
    '/': '/',
    '/dashboard': {
      en: '/dashboard',
      es: '/tablero',
      pt: '/painel',
      br: '/painel',
    },
    '/sign-in': {
      en: '/sign-in',
      es: '/iniciar-sesion',
      pt: '/entrar',
      br: '/entrar',
    },
    '/sign-up': {
      en: '/sign-up',
      es: '/registrarse',
      pt: '/cadastrar',
      br: '/cadastrar',
    },
    // Add dynamic routes for user profiles and events
    '/[username]': '/[username]',
    '/[username]/[eventSlug]': '/[username]/[eventSlug]',
    '/[username]/[eventSlug]/success': '/[username]/[eventSlug]/success',
    '/[username]/[eventSlug]/payment-processing': '/[username]/[eventSlug]/payment-processing',

    // Add legal pages routes
    '/legal': '/legal',
    '/legal/privacy': '/legal/privacy',
    '/legal/terms': '/legal/terms',
  },
});
