'use client';

import { PlatformDisclaimer } from '@/components/shared/ui-utilities/PlatformDisclaimer';
import { Button } from '@/components/ui/button';
import MuxVideo from '@mux/mux-player-react/lazy';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useCookieConsent } from 'react-cookie-manager';
import ReactMarkdown from 'react-markdown';

/**
 * Mux video asset configuration
 * Uploaded via next-video sync to Mux CDN
 * Playback ID: Ol6kzy3beOk2U4RHBssK2n7wtDlqHLWvmOPWH01VOVwA
 */
const MUX_PLAYBACK_ID = 'Ol6kzy3beOk2U4RHBssK2n7wtDlqHLWvmOPWH01VOVwA';
const MUX_POSTER_URL = `https://image.mux.com/${MUX_PLAYBACK_ID}/thumbnail.webp?time=0`;

const Hero = () => {
  const t = useTranslations('hero');
  const [videoError, setVideoError] = useState(false);

  // Check cookie consent status - video only loads when user has accepted cookies
  // We check hasConsent (general acceptance) since Mux streaming is essential for the Hero
  // but respects the user's choice to decline
  const { hasConsent } = useCookieConsent();
  const canPlayVideo = !videoError && hasConsent === true;

  // Handle video errors gracefully - fall back to poster image
  const handleVideoError = useCallback(() => {
    console.warn('[Hero] Video failed to load, falling back to poster image');
    setVideoError(true);
  }, []);

  return (
    <section
      className="lg:rounded-5xl relative m-2 overflow-hidden rounded-2xl bg-eleva-neutral-900"
      data-component-name="hero"
    >
      {/* Priority load poster image for instant FCP - always visible as fallback */}
      <Image
        src={MUX_POSTER_URL}
        alt="Eleva Care Hero"
        fill
        priority
        quality={90}
        className="lg:rounded-5xl rounded-2xl object-cover"
        sizes="100vw"
        unoptimized
      />
      {/* Mux Video Player - Only renders after cookie consent is given */}
      {/* Privacy Configuration:
       * - disableTracking: Completely disables Mux Data analytics (no QoE metrics sent)
       * - disableCookies: Prevents Mux from setting cookies for session tracking
       * - noVolumePref: Disables localStorage usage for volume preference
       * - nohotkeys: Disables keyboard shortcuts to prevent event tracking
       * - No metadata-* props: Prevents sending video/viewer identifiers
       * - No env-key: Ensures no Mux Data environment is configured
       */}
      {canPlayVideo && (
        <MuxVideo
          playbackId={MUX_PLAYBACK_ID}
          streamType="on-demand"
          autoPlay="muted"
          loop
          muted
          playsInline
          preload="auto"
          // Privacy settings - disable all tracking and data collection
          disableTracking
          disableCookies
          noVolumePref
          nohotkeys
          className="lg:rounded-5xl absolute inset-0 z-[1] h-full w-full rounded-2xl object-cover"
          style={{
            '--controls': 'none',
            '--media-object-fit': 'cover',
            '--media-object-position': 'center',
            aspectRatio: 'unset',
          }}
          onError={handleVideoError}
        />
      )}
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 z-10 bg-eleva-neutral-900/40" />
      {/* Hero content */}
      <div className="relative z-20 px-4 lg:px-6">
        <div className="mx-auto flex max-w-2xl flex-col justify-end pt-44 lg:max-w-7xl lg:justify-between lg:pt-72">
          <div>
            <h1 className="max-w-5xl text-balance font-serif text-5xl/[0.9] font-light tracking-tight text-eleva-neutral-100 lg:text-8xl/[.9]">
              <ReactMarkdown>{t('title')}</ReactMarkdown>
            </h1>
          </div>
          <div>
            <p className="mb-4 mt-8 max-w-lg text-balance font-sans text-xl/6 font-light text-eleva-neutral-100 lg:mb-8 lg:mt-16 lg:text-2xl/7">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex flex-col justify-between lg:mb-20 lg:flex-row">
            <div className="items-center gap-x-4 sm:flex">
              <div>
                <Button
                  asChild
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-transparent bg-eleva-neutral-100 px-8 py-[1.3rem] text-base font-semibold text-eleva-neutral-900 shadow-md hover:bg-eleva-neutral-100/70 lg:w-min lg:py-6 lg:text-lg lg:font-bold"
                >
                  <Link href="#experts">{t('cta2')}</Link>
                </Button>
              </div>
              <div className="mt-2 max-w-xs text-balance text-center text-xs font-light text-eleva-neutral-100/90 lg:mt-0 lg:text-left lg:text-sm/[1.3]">
                {t('disclaimer')}{' '}
                <PlatformDisclaimer>
                  <button className="inline-flex items-center underline decoration-eleva-neutral-100/50 underline-offset-2 transition-colors hover:text-eleva-neutral-100 hover:decoration-eleva-neutral-100">
                    {t('disclaimerLink')}
                  </button>
                </PlatformDisclaimer>
              </div>
            </div>
            <div>
              <Link href="https://patimota.typeform.com/to/XNQHJbgT" target="_blank">
                <Button className="mb-7 mt-5 inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-eleva-neutral-100/30 bg-eleva-neutral-100/40 p-5 text-sm font-medium text-eleva-neutral-900 shadow-sm hover:bg-eleva-neutral-100/50 md:w-auto lg:my-0 lg:bg-eleva-neutral-100/10 lg:p-6 lg:text-eleva-neutral-100 lg:shadow-none lg:hover:text-eleva-neutral-900">
                  <ClipboardList className="mr-2 h-5 w-5" />
                  {t('cta1')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
