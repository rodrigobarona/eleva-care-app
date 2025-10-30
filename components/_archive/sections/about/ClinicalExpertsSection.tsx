'use client';

import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

type Expert = {
  name: string;
  flags: string;
  role: string;
  image: string;
};

type ClinicalExpertsSectionProps = {
  title: string;
  clinicalExperts: Expert[];
};

export default function ClinicalExpertsSection({
  title,
  clinicalExperts,
}: ClinicalExpertsSectionProps) {
  return (
    <section>
      <h3 className="mt-24 font-mono text-xs/5 font-normal uppercase tracking-widest text-eleva-neutral-900/70">
        {title}
      </h3>
      <Separator className="mt-6" />
      <ul className="mx-auto mt-16 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
        {clinicalExperts.map((expert) => (
          <li key={expert.name} className="flex items-center gap-4">
            <Image
              src={expert.image}
              alt={expert.name}
              width={200}
              height={200}
              className="size-40 rounded-full object-cover"
            />
            <div className="text-sm/6">
              <h4 className="font-medium text-eleva-primary">
                {expert.name} {expert.flags}
              </h4>
              <p className="font-mono text-xs text-eleva-neutral-900">{expert.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
