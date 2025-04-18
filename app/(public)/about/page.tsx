import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Our Mission | Eleva Care',
  description:
    'Transforming women&apos;s health care through innovation and compassion. Learn about Eleva Care&apos;s mission, vision, and commitment to women&apos;s health.',
};

export default function AboutPage() {
  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          {/* Mission Section */}
          <section className="pt-16 md:pt-32">
            <div className="space-y-6">
              <h1 className="text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
                Transforming women&apos;s health care through innovation and compassion
              </h1>
              <p className="mt-6 max-w-3xl text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                At Eleva Care, we are dedicated to empowering women of all ages to take control of
                their health and well-being.
              </p>
            </div>
          </section>

          {/* Vision & Mission Details */}
          <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-lg">
              <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                Our mission
              </h2>
              <p className="mt-6 text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                Our mission is to provide a supportive and inclusive platform that connects
                individuals with expert-led resources, evidence-based information, and a
                collaborative community of healthcare professionals.
              </p>
              <p className="mt-8 text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                We believe in making quality healthcare accessible to all women, empowering them
                with knowledge, and fostering collaboration for better health outcomes. Our approach
                recognizes that women&apos;s health is a lifelong, evolving journey.
              </p>
            </div>

            <div className="pt-20 lg:row-span-2 lg:-mr-16 xl:mr-auto">
              <div className="-mx-8 grid grid-cols-2 gap-4 sm:-mx-16 sm:grid-cols-4 lg:mx-0 lg:grid-cols-2 lg:gap-4 xl:gap-8">
                <div className="aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/Pregnant-Woman-Flowers.jpg"
                    alt="Pregnant woman with flowers"
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="-mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10 lg:-mt-32">
                  <Image
                    src="/img/Woman-Working-Out-Living-Room.jpg"
                    alt="Woman exercising"
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/Smiling-Women-Photo.jpg"
                    alt="Smiling women"
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="-mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10 lg:-mt-32">
                  <Image
                    src="/img/cancer-journey.jpg"
                    alt="Supporting cancer journey"
                    width={300}
                    height={450}
                    className="block size-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="max-lg:mt-16 lg:col-span-1">
              <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                The Numbers
              </h2>
              <Separator className="mt-6" />
              <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="flex flex-col gap-y-2 max-sm:border-b max-sm:border-dotted max-sm:border-eleva-neutral-200 max-sm:pb-4">
                  <dt className="text-sm/6 text-eleva-neutral-900/60">Patient Satisfaction</dt>
                  <dd className="order-first font-serif text-6xl font-light tracking-tighter text-eleva-primary">
                    95%
                  </dd>
                </div>
                <div className="flex flex-col gap-y-2">
                  <dt className="text-sm/6 text-eleva-neutral-900/60">Support Available</dt>
                  <dd className="order-first font-serif text-6xl font-light tracking-tighter text-eleva-primary">
                    24/7
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Vision Section */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Our Vision
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              Bridging science and care for every woman
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              To bridge the gap between scientific research and practical application, delivering
              accessible and personalized women&apos;s health care solutions throughout every life
              stage.
            </p>
          </section>

          {/* Core Beliefs */}
          <section className="mt-24">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Our Core Beliefs
            </h2>
            <Separator className="mt-6" />
            <ul className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  Quality Healthcare Access
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  Every woman deserves access to quality healthcare, regardless of location or
                  circumstances.
                </p>
              </li>
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  Knowledge is Power
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  Empowering women with evidence-based information to make informed healthcare
                  decisions.
                </p>
              </li>
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  Collaborative Care
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  Better health outcomes are achieved through collaboration between patients and
                  healthcare providers.
                </p>
              </li>
              <li>
                <h3 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                  Lifelong Journey
                </h3>
                <p className="mt-4 text-base/6 text-eleva-neutral-900/60">
                  Women&apos;s health is a continuous journey that evolves through different life
                  stages.
                </p>
              </li>
            </ul>
          </section>

          {/* Team Section */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Meet our team
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              Led by healthcare innovators and experts
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              Our team combines expertise in women&apos;s health, technology, and patient care to
              revolutionize healthcare delivery.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="max-w-xl">
                <p className="text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                  Founded by healthcare professionals who witnessed firsthand the gaps in
                  women&apos;s healthcare, Eleva Care emerged from a shared vision to make expert
                  care more accessible, personalized, and comprehensive.
                </p>
                <p className="mt-8 text-base/6 text-eleva-neutral-900/60 lg:text-lg/7">
                  Today, Eleva Care is transforming how women access and experience healthcare. Our
                  platform connects thousands of women with specialized healthcare providers,
                  offering evidence-based care and support throughout every life stage.
                </p>
              </div>

              <div className="flex justify-center max-lg:order-first max-lg:max-w-lg">
                <div className="aspect-3/2 max-w-96 overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/about/team-photo.png"
                    alt="Eleva Care team meeting"
                    width={300}
                    height={200}
                    className="block size-full object-cover"
                  />
                </div>
              </div>
            </div>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Our Leadership
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
                  <h3 className="font-medium text-eleva-primary">Patricia Mota, PT, PhD 🇵🇹 🇪🇸 🇺🇸</h3>
                  <p className="font-mono text-xs text-eleva-neutral-900">
                    Co-Founder / Chief Executive Officer
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
                    Co-Founder / Chief Technical Officer
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* Board of Advisors Section */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Board of Advisors
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              Guided by industry experts
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              Our advisory board brings together leading voices in women&apos;s health, healthcare
              innovation, and digital transformation.
            </p>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Healthcare Innovation
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
                      Board Advisor Women&apos;s Health
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    Clinical research and education empower women to make informed decisions about
                    their healthcare journey
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
                      Board Advisor Obstetric Physical Therapy
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    Evidence-based physical therapy transforms the pregnancy and birth experience,
                    empowering women through every stage.
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
                      Board Advisor Women&apos;s Health
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    Clinical research advances rehabilitation treatments while empowering women
                    through evidence-based education.
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
                      Board Advisor Women&apos;s Health
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    Understanding pain mechanisms transforms how we care for women during pregnancy
                    and beyond.
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
                      Board Advisor Exercise Science
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    Evidence shows that personalized exercise during pregnancy can transform
                    women&apos;s health outcomes.
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
                      Board Advisor Biomechanics & Perinatal Health
                    </p>
                  </div>
                  <blockquote className="max-w-sm font-serif text-sm/6 italic text-eleva-neutral-900/60">
                    Understanding movement patterns during and after pregnancy helps optimize care
                    and improve long-term outcomes for women.
                  </blockquote>
                </div>
              </li>
            </ul>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Clinical Excellence
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
                    Oncology Rehabilitation
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
                  <h4 className="font-medium text-eleva-primary">Joana Goulão Barros, MD, PhD 🇵🇹</h4>
                  <p className="font-mono text-xs text-eleva-neutral-900">
                    Obstetrics & Gynecology
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* Expert Recruitment CTA */}
          <section className="mt-32">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Join Our Network
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-neutral-900 sm:text-6xl">
              Transform women&apos;s healthcare with us
            </h3>
            <p className="mt-6 max-w-3xl text-2xl font-light text-eleva-neutral-900/80">
              Join a community of dedicated healthcare professionals making quality care accessible
              to women everywhere.
            </p>

            <div className="mt-24 grid grid-cols-1 gap-16 lg:grid-cols-[1fr_24rem]">
              <div className="lg:max-w-2xl">
                <h3 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
                  Why Join Eleva
                </h3>
                <ul className="mt-8 space-y-8">
                  <li>
                    <h4 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                      Flexible Practice
                    </h4>
                    <p className="mt-3 text-base/6 text-eleva-neutral-900/60">
                      Practice on your terms with our flexible telehealth platform. Set your own
                      schedule and connect with patients from anywhere.
                    </p>
                  </li>
                  <li>
                    <h4 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                      Innovative Technology
                    </h4>
                    <p className="mt-3 text-base/6 text-eleva-neutral-900/60">
                      Access state-of-the-art telehealth tools and AI-assisted clinical support to
                      enhance your practice.
                    </p>
                  </li>
                  <li>
                    <h4 className="font-serif text-xl font-light tracking-tighter text-eleva-primary">
                      Collaborative Community
                    </h4>
                    <p className="mt-3 text-base/6 text-eleva-neutral-900/60">
                      Join a network of leading healthcare professionals and participate in case
                      discussions and knowledge sharing.
                    </p>
                  </li>
                </ul>
                <div className="mt-10">
                  <Link href="https://accounts.eleva.care/waitlist" target="_blank">
                    <Button size="lg" className="rounded-full">
                      Apply to Join
                    </Button>
                  </Link>
                </div>
              </div>

              {/* <div className="aspect-3/4 relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl">
                <Image
                  src="/img/about/team/team-patricia-mota.jpg"
                  alt="Doctor providing consultation"
                  fill
                  className="absolute inset-0 object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black from-10% to-75% ring-1 ring-inset ring-eleva-neutral-900/10 lg:from-25%"
                />
                <figure className="relative p-10">
                  <blockquote>
                    <p className="relative text-xl/7 text-white before:absolute before:-translate-x-full before:content-[''] after:absolute after:content-['']">
                      Joining Eleva Care has allowed me to reach more patients and provide
                      comprehensive care while maintaining work-life balance.
                    </p>
                  </blockquote>
                  <figcaption className="mt-6 border-t border-white/20 pt-6">
                    <p className="text-sm/6 font-medium text-white">Dr. Jennifer Martinez</p>
                    <p className="text-sm/6 font-medium">
                      <span className="from-28% bg-gradient-to-r from-[#fff1be] via-[#ee87cb] via-70% to-[#b060ff] bg-clip-text text-transparent">
                        OB-GYN, Eleva Provider
                      </span>
                    </p>
                  </figcaption>
                </figure>
              </div> */}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
