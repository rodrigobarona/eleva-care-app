import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import Image from 'next/image';

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
                <div className="flex flex-col gap-y-2 border-b border-dotted border-eleva-neutral-200 pb-4">
                  <dt className="text-sm/6 text-eleva-neutral-900/60">Women Helped</dt>
                  <dd className="order-first font-serif text-6xl font-light tracking-tighter text-eleva-primary">
                    10K+
                  </dd>
                </div>
                <div className="flex flex-col gap-y-2 border-b border-dotted border-eleva-neutral-200 pb-4">
                  <dt className="text-sm/6 text-eleva-neutral-900/60">Expert Providers</dt>
                  <dd className="order-first font-serif text-6xl font-light tracking-tighter text-eleva-primary">
                    50+
                  </dd>
                </div>
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
              <div className="max-w-lg">
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

              <div className="max-lg:order-first max-lg:max-w-lg">
                <div className="aspect-3/2 overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
                  <Image
                    src="/img/about/team-photo.png"
                    alt="Eleva Care team meeting"
                    width={600}
                    height={400}
                    className="block size-full object-cover"
                  />
                </div>
              </div>
            </div>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Our Leadership
            </h3>
            <Separator className="mt-6" />

            <ul className="mx-auto mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-patricia-mota.jpg"
                  alt="Dr. Patricia Mota"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium">Dr. Patricia Mota</h3>
                  <p className="text-eleva-neutral-900/60">Co-Founder / Chief Medical Officer</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-rodrigo-barona.jpg"
                  alt="Rodrigo Barona"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium">Rodrigo Barona</h3>
                  <p className="text-eleva-neutral-900/60">Co-Founder / CTO</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-patricia-driusso.jpg"
                  alt="Dr. Patricia Driusso"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium">Dr. Patricia Driusso</h3>
                  <p className="text-eleva-neutral-900/60">Head of Research</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-joana-barros.jpg"
                  alt="Dr. Joana Barros"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium">Dr. Joana Barros</h3>
                  <p className="text-eleva-neutral-900/60">Medical Director</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-jessica-margarido.jpg"
                  alt="Jessica Margarido"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium">Jessica Margarido</h3>
                  <p className="text-eleva-neutral-900/60">Clinical Operations Director</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-cristine-homsi-jorge.jpg"
                  alt="Dr. Cristine Homsi Jorge"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h3 className="font-medium">Dr. Cristine Homsi Jorge</h3>
                  <p className="text-eleva-neutral-900/60">Head of Patient Experience</p>
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
            <ul className="mx-auto mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <li>
                <div className="flex items-center gap-4">
                  <Image
                    src="/img/about/team/team-patricia-mota.jpg"
                    alt="Dr. Amanda White"
                    width={56}
                    height={56}
                    className="size-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">Dr. Amanda White, MD, MPH</h4>
                    <p className="text-eleva-neutral-900/60">
                      Former WHO Women&apos;s Health Advisor
                    </p>
                  </div>
                </div>
                <p className="mt-6 max-w-lg text-sm/6 text-eleva-neutral-900/60">
                  With over two decades of experience in global women&apos;s health initiatives, Dr.
                  White brings invaluable insights into healthcare accessibility and policy
                  implementation. Her work has helped shape international standards for maternal and
                  reproductive health care.
                </p>
              </li>
              <li>
                <div className="flex items-center gap-4">
                  <Image
                    src="/img/about/team/team-rodrigo-barona.jpg"
                    alt="Professor James Chen"
                    width={56}
                    height={56}
                    className="size-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">Professor James Chen, PhD</h4>
                    <p className="text-eleva-neutral-900/60">Digital Health Research Institute</p>
                  </div>
                </div>
                <p className="mt-6 max-w-lg text-sm/6 text-eleva-neutral-900/60">
                  A pioneer in digital health transformation, Professor Chen&apos;s research focuses
                  on leveraging technology to improve healthcare outcomes. His expertise in AI and
                  telemedicine has been instrumental in developing innovative care delivery models.
                </p>
              </li>
            </ul>

            <h3 className="mt-24 font-mono text-xs/5 font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
              Clinical Excellence
            </h3>
            <Separator className="mt-6" />
            <ul className="mx-auto mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-patricia-driusso.jpg"
                  alt="Dr. Elena Martinez"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium">Dr. Elena Martinez</h4>
                  <p className="text-eleva-neutral-900/60">Women&apos;s Health Research Center</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-joana-barros.jpg"
                  alt="Dr. Michael Patel"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium">Dr. Michael Patel</h4>
                  <p className="text-eleva-neutral-900/60">Digital Healthcare Association</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-jessica-margarido.jpg"
                  alt="Dr. Sarah Wong"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium">Dr. Sarah Wong</h4>
                  <p className="text-eleva-neutral-900/60">Maternal Health Foundation</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-cristine-homsi-jorge.jpg"
                  alt="Professor Rachel Adams"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium">Professor Rachel Adams</h4>
                  <p className="text-eleva-neutral-900/60">Healthcare Ethics Institute</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-patricia-mota.jpg"
                  alt="Dr. David Miller"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium">Dr. David Miller</h4>
                  <p className="text-eleva-neutral-900/60">Telehealth Innovation Lab</p>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <Image
                  src="/img/about/team/team-rodrigo-barona.jpg"
                  alt="Dr. Lisa Chen"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div className="text-sm/6">
                  <h4 className="font-medium">Dr. Lisa Chen</h4>
                  <p className="text-eleva-neutral-900/60">Preventive Medicine Institute</p>
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
                  <Button size="lg" className="rounded-full">
                    Apply to Join
                  </Button>
                </div>
              </div>

              <div className="aspect-3/4 relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl">
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
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
