'use client';

import { VideoPlayer } from '@/components/shared/media/VideoPlayer';
import { useEffect, useState } from 'react';

interface NetworkInformationLike {
  saveData?: boolean;
}

const HERO_VIDEO_SOURCES = [
  { src: '/img/videos/eleva-care-intro-banner-960.webm', type: 'video/webm' },
  { src: '/img/videos/eleva-care-intro-banner-960.mp4', type: 'video/mp4' },
];

/**
 * Background loop for the home hero.
 *
 * Renders nothing on the server and on the first client render (so SSR markup
 * and hydration are stable); the next/image poster underneath is the LCP
 * element. After mount it only mounts the <video> when the visitor does not
 * prefer reduced motion and has not enabled Data Saver. No `poster` attribute:
 * the transparent video sits on top of the already-loaded next/image poster, so
 * the poster is fetched once.
 */
export function HeroVideo({ className }: { className?: string }) {
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike })
      .connection;

    const update = () => setShouldPlay(!reducedMotion.matches && !connection?.saveData);
    update();

    reducedMotion.addEventListener('change', update);
    return () => reducedMotion.removeEventListener('change', update);
  }, []);

  if (!shouldPlay) return null;

  return (
    <VideoPlayer
      sources={HERO_VIDEO_SOURCES}
      width={1920}
      height={1080}
      playsInline
      autoPlay
      muted
      loop
      controls={false}
      preload="auto"
      className={className}
    />
  );
}

export default HeroVideo;
