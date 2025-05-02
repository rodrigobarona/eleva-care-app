import { isValidLocale } from '@/app/i18n';
import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  console.log('About page - generateMetadata called with locale:', locale);

  // Validate locale before proceeding
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in About page metadata: ${locale}`);
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'About' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// Separate component that uses hooks
function AboutContent() {
  const t = useTranslations('About');

  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          {/* Mission Section */}
          <section className="pt-16 md:pt-32">
            <div className="space-y-6">
              <h1 className="text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
                {t('hero.title')}
              </h1>
              <p className="mt-6 max-w-3xl text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                {t('hero.description')}
              </p>
            </div>
          </section>

          {/* Vision & Mission Details */}
          <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-lg">
              <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                {t('mission.label')}
              </h2>
              <p className="mt-6 text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                {t('mission.description1')}
              </p>
              <p className="mt-8 text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                {t('mission.description2')}
              </p>
            </div>

            <div className="pt-20 lg:row-span-2 lg:-mr-16 xl:mr-auto">
              <div className="-mx-8 grid grid-cols-2 gap-4 sm:-mx-16 sm:grid-cols-4 lg:mx-0 lg:grid-cols-2 lg:gap-4 xl:gap-8">
                <div className="aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/Pregnant-Woman-Flowers.jpg"
                    alt={t('images.pregnantWoman')}
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="-mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10 lg:-mt-32">
                  <Image
                    src="/img/Woman-Working-Out-Living-Room.jpg"
                    alt={t('images.womanExercising')}
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/Smiling-Women-Photo.jpg"
                    alt={t('images.smilingWomen')}
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="-mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10 lg:-mt-32">
                  <Image
                    src="/img/cancer-journey.jpg"
                    alt={t('images.cancerJourney')}
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="max-lg:mt-16 lg:col-span-1">
              <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                {t('stats.label')}
              </h2>
              <Separator className="mt-6" />
              <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="flex flex-col gap-y-2 max-sm:border-b max-sm:border-dotted max-sm:border-eleva-neutral-200 max-sm:pb-4">
                  <dt className="text-sm/6 text-eleva-neutral-900/60">
                    {t('stats.patientSatisfaction.label')}
                  </dt>
                  <dd className="order-first font-serif text-6xl font-light tracking-tighter text-eleva-primary">
                    {t('stats.patientSatisfaction.value')}
                  </dd>
                </div>
                <div className="flex flex-col gap-y-2">
                  <dt className="text-sm/6 text-eleva-neutral-900/60">
                    {t('stats.supportAvailable.label')}
                  </dt>
                  <dd className="order-first font-serif text-6xl font-light tracking-tighter text-eleva-primary">
                    {t('stats.supportAvailable.value')}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Vision Section */}
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

          {/* Core Beliefs */}
          <section className="mt-24">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('beliefs.label')}
            </h2>
            <Separator className="mt-6" />
            <ul className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  {t('beliefs.qualityHealthcare.title')}
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  {t('beliefs.qualityHealthcare.description')}
                </p>
              </li>
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  {t('beliefs.knowledgeIsPower.title')}
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  {t('beliefs.knowledgeIsPower.description')}
                </p>
              </li>
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  {t('beliefs.collaborativeCare.title')}
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  {t('beliefs.collaborativeCare.description')}
                </p>
              </li>
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  {t('beliefs.lifelongJourney.title')}
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  {t('beliefs.lifelongJourney.description')}
                </p>
              </li>
            </ul>
          </section>

          {/* Team Section */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('team.label')}
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              {t('team.title')}
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              {t('team.description')}
            </p>

            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="max-w-xl">
                <p className="text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                  {t('team.foundedDescription')}
                </p>
                <p className="mt-8 text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                  {t('team.transformingDescription')}
                </p>
              </div>

              <div className="flex justify-center max-lg:order-first max-lg:max-w-lg">
                <div className="aspect-3/2 max-w-96 overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/about/team-photo.png"
                    alt={t('team.photoAlt')}
                    width={300}
                    height={200}
                    className="block size-full object-cover"
                  />
                </div>
              </div>
            </div>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('leadership.label')}
            </h3>
            <Separator className="mt-6" />

            <ul className="mx-auto mt-16 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-patricia-mota.jpg"
                  alt="Patricia Mota, PT, PhD"
                  width={200}
                  height={200}
                  className="size-40 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium text-eleva-primary">
                    Patricia Mota, PT, PhD 🇵🇹 🇪🇸 🇺🇸
                  </h3>
                  <p className="font-mono text-xs text-eleva-neutral-900">
                    {t('leadership.patriciaMota.role')}
                  </p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-rodrigo-barona.jpg"
                  alt="Rodrigo Barona"
                  width={200}
                  height={200}
                  className="size-40 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium text-eleva-primary">Rodrigo Barona 🇪🇸 🇵🇹 🇺🇸</h3>
                  <p className="font-mono text-xs text-eleva-neutral-900">
                    {t('leadership.rodrigoBarona.role')}
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* Board of Advisors Section */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('advisors.label')}
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              {t('advisors.title')}
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              {t('advisors.description')}
            </p>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('advisors.healthcareInnovation.label')}
            </h3>
            <Separator className="mt-6" />
            <ul className="mx-auto mt-10 grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
              <li>
                <div className="flex flex-col items-center gap-4 text-center">
                  <Image
                    src="/img/about/team/team-cristine-homsi-jorge.jpg"
                    alt="Cristine Homsi Jorge"
                    width={200}
                    height={200}
                    className="size-40 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-eleva-primary">
                      Cristine Homsi Jorge, PT, PhD 🇧🇷
                    </h4>
                    <p className="font-mono text-xs text-eleva-neutral-900">
                      {t('advisors.cristineHomsi.role')}
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    {t('advisors.cristineHomsi.quote')}
                  </blockquote>
                </div>
              </li>
              <li>
                <div className="flex flex-col items-center gap-4 text-center">
                  <Image
                    src="/img/about/team/team-alexandre-delgado.jpg"
                    alt="Alexandre Delgado"
                    width={200}
                    height={200}
                    className="size-40 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-eleva-primary">
                      Alexandre Delgado, PT, PhD 🇧🇷
                    </h4>
                    <p className="font-mono text-xs text-eleva-neutral-900">
                      {t('advisors.alexandreDelgado.role')}
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    {t('advisors.alexandreDelgado.quote')}
                  </blockquote>
                </div>
              </li>
              <li>
                <div className="flex flex-col items-center gap-4 text-center">
                  <Image
                    src="/img/about/team/team-patricia-driusso.jpg"
                    alt="Patricia Driusso"
                    width={200}
                    height={200}
                    className="size-40 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-eleva-primary">Patricia Driusso, PT, PhD 🇧🇷</h4>
                    <p className="font-mono text-xs text-eleva-neutral-900">
                      {t('advisors.patriciaDriusso.role')}
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    {t('advisors.patriciaDriusso.quote')}
                  </blockquote>
                </div>
              </li>
              <li>
                <div className="flex flex-col items-center gap-4 text-center">
                  <Image
                    src="/img/about/team/team-annelie-gutke.jpg"
                    alt="Annelie Gutke"
                    width={200}
                    height={200}
                    className="size-40 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-eleva-primary">Annelie Gutke, PT, PhD 🇸🇪</h4>
                    <p className="font-mono text-xs text-eleva-neutral-900">
                      {t('advisors.annelieGutke.role')}
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    {t('advisors.annelieGutke.quote')}
                  </blockquote>
                </div>
              </li>
              <li>
                <div className="flex flex-col items-center gap-4 text-center">
                  <Image
                    src="/img/about/team/team-ruben-barakat.jpg"
                    alt="Ruben Barakat"
                    width={200}
                    height={200}
                    className="size-40 rounded-full object-cover"
                    quality={100}
                  />
                  <div>
                    <h4 className="font-medium text-eleva-primary">Ruben Barakat, PhD 🇦🇷 🇪🇸</h4>
                    <p className="font-mono text-xs text-eleva-neutral-900">
                      {t('advisors.rubenBarakat.role')}
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    {t('advisors.rubenBarakat.quote')}
                  </blockquote>
                </div>
              </li>
              <li>
                <div className="flex flex-col items-center gap-4 text-center">
                  <Image
                    src="/img/about/team/team-jenny-bagwell-california-usa.jpg"
                    alt="Jenny Bagwell"
                    width={200}
                    height={200}
                    className="size-40 rounded-full object-cover"
                    quality={100}
                  />
                  <div>
                    <h4 className="font-medium text-eleva-primary">
                      Jenny Bagwell, PT, PhD, DPT 🇺🇸
                    </h4>
                    <p className="font-mono text-xs text-eleva-neutral-900">
                      {t('advisors.jennyBagwell.role')}
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    {t('advisors.jennyBagwell.quote')}
                  </blockquote>
                </div>
              </li>
            </ul>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('clinical.label')}
            </h3>
            <Separator className="mt-6" />
            <ul className="mx-auto mt-16 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-jessica-margarido.jpg"
                  alt="Jessica Margarido, PT"
                  width={200}
                  height={200}
                  className="size-40 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium text-eleva-primary">Jessica Margarido, PT 🇵🇹</h4>
                  <p className="font-mono text-xs text-eleva-neutral-900">
                    {t('clinical.jessicaMargarido.role')}
                  </p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-joana-barros.jpg"
                  alt="Joana Goulão Barros, MD, PhD"
                  width={200}
                  height={200}
                  className="size-40 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium text-eleva-primary">
                    Joana Goulão Barros, MD, PhD 🇵🇹
                  </h4>
                  <p className="font-mono text-xs text-eleva-neutral-900">
                    {t('clinical.joanaBarros.role')}
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* Expert Recruitment CTA */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              {t('joinNetwork.label')}
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              {t('joinNetwork.title')}
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              {t('joinNetwork.description')}
            </p>

            <div className="mt-24 grid grid-cols-1 gap-16 lg:grid-cols-[1fr_24rem]">
              <div className="lg:max-w-2xl">
                <h3 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                  {t('whyJoin.label')}
                </h3>
                <ul className="mt-8 space-y-8">
                  <li>
                    <h4 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                      {t('whyJoin.flexiblePractice.title')}
                    </h4>
                    <p className="mt-3 text-base/6 text-eleva-neutral-900/60">
                      {t('whyJoin.flexiblePractice.description')}
                    </p>
                  </li>
                  <li>
                    <h4 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                      {t('whyJoin.innovativeTechnology.title')}
                    </h4>
                    <p className="mt-3 text-base/6 text-eleva-neutral-900/60">
                      {t('whyJoin.innovativeTechnology.description')}
                    </p>
                  </li>
                  <li>
                    <h4 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                      {t('whyJoin.collaborativeCommunity.title')}
                    </h4>
                    <p className="mt-3 text-base/6 text-eleva-neutral-900/60">
                      {t('whyJoin.collaborativeCommunity.description')}
                    </p>
                  </li>
                </ul>
                <div className="mt-10">
                  <a
                    href="https://accounts.eleva.care/waitlist"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" className="rounded-full">
                      {t('whyJoin.applyButton')}
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// Main page component
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  console.log('About page - rendering with locale:', locale);

  // Validate locale to prevent errors
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in About page: ${locale}`);
    notFound();
  }

  return <AboutContent />;
}
