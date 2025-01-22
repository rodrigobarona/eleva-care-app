"use client";

import type React from "react";
import FadeInSection from "@/components/atoms/FadeInSection";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/components/molecules/LanguageProvider";
import { translations as en } from "@/public/locales/en";
import { translations as pt } from "@/public/locales/pt";
import { translations as br } from "@/public/locales/br";
import { translations as es } from "@/public/locales/es";

const languageMap = {
  en,
  br,
  pt,
  es,
};

const ApproachSection: React.FC = () => {
  const { lang } = useLanguage();
  const t = languageMap[lang];

  return (
    <FadeInSection>
      <section
        id="approach"
        className="mx-2 mt-24 rounded-2xl bg-[linear-gradient(145deg,var(--tw-gradient-stops))] from-eleva-highlight-yellow from-[28%] via-eleva-highlight-red via-[70%] to-eleva-highlight-purple py-10 lg:mt-32 lg:rounded-5xl lg:bg-[linear-gradient(115deg,var(--tw-gradient-stops))] lg:pb-32 lg:pt-20"
      >
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="grid grid-flow-row-dense grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="col-span-12 -mt-24 lg:col-span-5 lg:-mt-52">
              <div className="-m-4 aspect-[3/4] rounded-xl bg-eleva-neutral-100/15 shadow-[inset_0_0_2px_1px_#ffffff4d] ring-1 ring-eleva-neutral-900/5 max-lg:mx-auto max-lg:max-w-xs lg:-m-10 lg:rounded-4xl">
                <div className="rounded-xl p-2 shadow-md shadow-eleva-neutral-900/5 lg:rounded-4xl">
                  <div className="overflow-hidden rounded-xl shadow-2xl outline outline-1 -outline-offset-1 outline-eleva-neutral-900/10 lg:rounded-3xl">
                    <Image
                      alt=""
                      src="/img/Three-Women-Posing-Photo.jpg"
                      width={1920}
                      height={1280}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 pl-6 lg:col-span-7 lg:pl-16">
              <div>
                <h2 className="text-pretty font-serif text-3xl font-light tracking-tighter text-eleva-neutral-100 data-[dark]:text-eleva-neutral-100 lg:text-6xl">
                  {t.approach.title}
                </h2>
              </div>
              <ol className="mx-auto mt-6 list-none text-eleva-neutral-100 marker:text-[#40514e] lg:mt-8">
                {t.approach.items.map((item, index) => (
                  <li
                    key={item}
                    className="flex flex-row items-start pr-4 sm:text-balance lg:items-center lg:pr-0"
                  >
                    <span className="flex w-5 pt-2 text-right font-serif text-xl italic lg:w-8 lg:pt-0 lg:text-5xl">
                      {index + 1}
                    </span>
                    <span className="ml-1 block py-2 text-base lg:ml-6 lg:py-6 lg:text-2xl">
                      <ReactMarkdown>{item}</ReactMarkdown>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default ApproachSection;
