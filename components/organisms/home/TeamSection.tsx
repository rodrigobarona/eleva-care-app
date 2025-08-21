import { Card, CardContent } from '@/components/atoms/card';
import FadeInSection from '@/components/atoms/FadeInSection';
// Adjust the import path as necessary
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/molecules/carousel';
// Adjust the import path as necessary
import Image from 'next/image';
import type React from 'react';

// Adjust the import path based on your types definition

// Define the type for team members
export type TeamMember = {
  name: string;
  role: string;
  image: string;
  quote: string;
  description?: string; // Add description as an optional property
  socialLinks?: {
    // Change socialLinks to an object with optional properties
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
};

type TeamSectionProps = {
  title: string;
  subtitle: string;
  description: string;
  members: TeamMember[]; // Assuming you have a TeamMember type defined
};

const TeamSection: React.FC<TeamSectionProps> = ({ title, subtitle, description, members }) => {
  return (
    <FadeInSection>
      <section id="team" className="w-full px-6 pb-24 pt-12 md:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-12">
            <h2 className="font-mono text-xs/5 font-normal uppercase tracking-widest text-eleva-neutral-900/70 data-[dark]:text-eleva-neutral-900/60">
              {title}
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-primary data-[dark]:text-eleva-neutral-100 sm:text-6xl">
              {subtitle}
            </h3>
          </div>
          <p className="mt-6 text-balance text-base font-light text-eleva-neutral-900 lg:text-xl">
            {description}
          </p>
          <div className="embla">
            <Carousel
              className="mt-12"
              opts={{
                align: 'start',
                loop: false,
              }}
            >
              <CarouselContent className="-ml-4">
                {members.map((member, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="border-elevaNeutral-200 relative flex aspect-[9/15] overflow-hidden rounded-3xl">
                      <CardContent className="flex flex-col items-center justify-end p-0">
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={1200}
                          height={1200}
                          className="absolute inset-x-0 top-0 aspect-[3/4] w-full object-cover"
                        />
                        <div
                          aria-hidden="true"
                          className="from-elevaNeutral-900 absolute inset-0 top-0 z-20 h-full w-full rounded-3xl bg-gradient-to-t from-25% to-40%"
                        ></div>
                        <figure className="relative z-20 p-10">
                          <blockquote>
                            <p className="text-elevaNeutral-100 relative text-pretty text-sm/4 lg:text-xl/7">
                              <span aria-hidden="true" className="absolute -translate-x-full">
                                “
                              </span>
                              {member.quote}
                              <span aria-hidden="true" className="absolute">
                                ”
                              </span>
                            </p>
                          </blockquote>
                          <figcaption className="border-elevaNeutral-100/20 mt-6 border-t pt-6">
                            <h3 className="text-elevaNeutral-100 text-sm/6 font-medium">
                              {member.name}
                            </h3>
                            <p className="text-sm/6 font-medium">
                              <span className="from-elevaHighlight-yellow to-elevaHighlight-red bg-gradient-to-r from-[28%] bg-clip-text text-transparent">
                                {member.role}
                              </span>
                            </p>
                          </figcaption>
                        </figure>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute right-12 mt-8 flex h-10 w-6 flex-row items-end justify-end">
                <CarouselPrevious className="h-12 w-12" />
                <CarouselNext className="h-12 w-12" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default TeamSection;
