import { useTranslations } from 'next-intl';

export default function VisionSection() {
  const t = useTranslations('about');

  return (
    <section className="mt-32">
      <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
        {t('vision.label')}
      </h2>
      <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
        {t('vision.title')}
      </h3>
      <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
        {t('vision.description')}
      </p>
    </section>
  );
}
