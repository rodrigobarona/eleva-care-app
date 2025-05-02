'use client';

import { Button } from '@/components/atoms/button';
import { LanguageSwitcher } from '@/components/molecules/LocaleSwitcher';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCookieConsent } from 'react-cookie-manager';

/**
 * Renders the localized, responsive footer for the website, including navigation links, legal information, a call-to-action section, language switching, and social media integration.
 *
 * @returns The complete footer component with internationalized content and cookie consent management.
 */
export default function Footer() {
  const t = useTranslations('footer');
  const { showConsentBanner } = useCookieConsent() || { showConsentBanner: () => {} };

  return (
    <footer>
      <div className="lg:rounded-5xl mx-2 rounded-2xl bg-[linear-gradient(145deg,var(--tw-gradient-stops))] from-eleva-highlight-yellow from-[28%] via-eleva-highlight-red via-[70%] to-eleva-highlight-purple">
        <div className="lg:rounded-5xl relative rounded-2xl">
          {/* Frosted glass effect overlay */}
          <div className="lg:rounded-5xl absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-sm" />

          <div className="relative px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:max-w-7xl">
              {/* CTA Section */}
              <section className="relative my-32">
                <div className="relative pb-16 pt-20 text-center sm:py-24">
                  <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                    {t('cta.title')}
                  </h2>
                  <p className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
                    {t('cta.heading')}
                  </p>
                  <p className="mx-auto mt-6 max-w-xs text-sm/6 text-gray-500">
                    {t('cta.description')}
                  </p>
                  <div className="mt-6 flex justify-center gap-4">
                    <Button size="lg" className="rounded-full">
                      <Link href="https://patimota.typeform.com/to/XNQHJbgT" target="_blank">
                        {t('cta.quiz')}
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full">
                      <Link href="/#experts">{t('cta.book')}</Link>
                    </Button>
                  </div>
                </div>
              </section>

              {/* Navigation Links */}
              <div className="pb-16">
                <div className="group/row relative isolate pt-[calc(theme(spacing.2)+1px)] last:pb-[calc(theme(spacing.2)+1px)]">
                  <div className="grid grid-cols-2 gap-y-10 pb-6 lg:grid-cols-6 lg:gap-8">
                    {/* Logo Column */}
                    <div className="col-span-2 flex">
                      <div className="pt-6 lg:pb-6">
                        <Link
                          href="/"
                          className="font-serif text-xl font-medium text-eleva-primary"
                        >
                          Eleva Care
                        </Link>
                        <p className="mt-4 text-sm text-eleva-neutral-900/60">{t('tagline')}</p>
                      </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="col-span-2 grid grid-cols-2 gap-x-8 gap-y-12 lg:col-span-4 lg:grid-cols-4 lg:pt-6">
                      <div>
                        <h3 className="text-sm/6 font-medium text-eleva-neutral-900/50">
                          {t('nav.services.title')}
                        </h3>
                        <ul className="mt-6 space-y-4 text-sm/6">
                          <li>
                            <Link
                              href="/services/pregnancy"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.services.pregnancy')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/services/postpartum"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.services.postpartum')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/services/menopause"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.services.menopause')}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm/6 font-medium text-eleva-neutral-900/50">
                          {t('nav.company.title')}
                        </h3>
                        <ul className="mt-6 space-y-4 text-sm/6">
                          <li>
                            <Link
                              href="/about"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.company.about')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href={`${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}`}
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.company.join')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href={`${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}`}
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.company.dashboard')}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm/6 font-medium text-eleva-neutral-900/50">
                          {t('nav.support.title')}
                        </h3>
                        <ul className="mt-6 space-y-4 text-sm/6">
                          <li>
                            <Link
                              href="/help"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.support.help')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/community"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.support.community')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/contact"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.support.contact')}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm/6 font-medium text-eleva-neutral-900/50">
                          {t('nav.legal.title')}
                        </h3>
                        <ul className="mt-6 space-y-4 text-sm/6">
                          <li>
                            <Link
                              href="/legal/terms"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.legal.terms')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/legal/privacy"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.legal.privacy')}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/legal/cookie"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.legal.cookie')}
                            </Link>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => showConsentBanner?.()}
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.legal.preferences')}
                            </button>
                          </li>
                          <li>
                            <Link
                              href="/legal/dpa"
                              className="font-medium text-eleva-neutral-900 hover:text-eleva-primary"
                            >
                              {t('nav.legal.dpa')}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex justify-between border-t border-gray-200/20 pt-8">
                  <div>
                    <p className="text-sm/6 text-gray-600">
                      © {new Date().getFullYear()} Eleva Care. {t('copyright')}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Language Switcher */}
                    <div className="text-gray-950">
                      <LanguageSwitcher />
                    </div>

                    {/* Social Links */}
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-950 hover:text-gray-950/75"
                      aria-label={t('social.instagram')}
                    >
                      <span className="sr-only">{t('social.instagram')}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <title>Instagram</title>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                    <a
                      href="https://twitter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-950 hover:text-gray-950/75"
                      aria-label={t('social.twitter')}
                    >
                      <span className="sr-only">{t('social.twitter')}</span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <title>Twitter</title>
                        <path d="M12.6 0h2.454l-5.36 6.778L16 16h-4.937l-3.867-5.594L2.771 16H.316l5.733-7.25L0 0h5.063l3.495 5.114L12.6 0zm-.86 14.376h1.36L4.323 1.539H2.865l8.875 12.837z" />
                      </svg>
                    </a>
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-950 hover:text-gray-950/75"
                      aria-label={t('social.linkedin')}
                    >
                      <span className="sr-only">{t('social.linkedin')}</span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <title>LinkedIn</title>
                        <path d="M14.82 0H1.18A1.169 1.169 0 000 1.154v13.694A1.168 1.168 0 001.18 16h13.64A1.17 1.17 0 0016 14.845V1.15A1.171 1.171 0 0014.82 0zM4.744 13.64H2.369V5.996h2.375v7.644zm-1.18-8.684a1.377 1.377 0 11.52-.106 1.377 1.377 0 01-.527.103l.007.003zm10.075 8.683h-2.375V9.921c0-.885-.015-2.025-1.234-2.025-1.218 0-1.425.966-1.425 1.968v3.775H6.233V5.997H8.51v1.05h.032c.317-.601 1.09-1.235 2.246-1.235 2.405-.005 2.851 1.578 2.851 3.63v4.197z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
