import Image from 'next/image';
import Link from 'next/link';

import { db } from '@/drizzle/db';
import { EventTable } from '@/drizzle/schema';
import { createClerkClient } from '@clerk/nextjs/server';
import { and, eq, gt, min } from 'drizzle-orm';

import { Card, CardContent } from '@/components/atoms/card';
import FadeInSection from '@/components/atoms/FadeInSection';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/molecules/carousel';

const ExpertsSection = async () => {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList();

  const profiles = await Promise.all(
    users.data.map(async (user) => {
      // Fetch profile and minimum price in parallel
      const [profile, minPricing] = await Promise.all([
        db.query.ProfileTable.findFirst({
          where: ({ clerkUserId }, { eq }) => eq(clerkUserId, user.id),
        }),
        db
          .select({
            price: min(EventTable.price),
            currency: EventTable.currency,
          })
          .from(EventTable)
          .where(and(eq(EventTable.clerkUserId, user.id), gt(EventTable.price, 0)))
          .groupBy(EventTable.currency)
          .limit(1),
      ]);

      const currencySymbols: Record<string, string> = {
        EUR: '€',
        USD: '$',
        GBP: '£',
      };

      const formattedPrice = minPricing?.[0]?.price
        ? `${
            currencySymbols[minPricing[0].currency?.toUpperCase() || 'EUR'] || '€'
          }${(minPricing[0].price / 100).toFixed(0)} • Session`
        : null;

      return {
        id: user.id,
        name: profile ? `${profile.firstName} ${profile.lastName}` : user.fullName,
        username: user.username,
        image: profile?.profilePicture || user.imageUrl,
        headline: profile?.headline || '',
        shortBio: profile?.shortBio || '',
        price: formattedPrice,
        rating: '5.0',
      };
    }),
  );

  // Filter out profiles without prices and sort by minimum price
  const expertsWithPricing = profiles
    .filter((profile) => profile.price !== null)
    .sort((a, b) => {
      const priceA = Number.parseInt(a.price?.split('$')[1] || '0');
      const priceB = Number.parseInt(b.price?.split('$')[1] || '0');
      return priceA - priceB;
    });

  return (
    <FadeInSection>
      <section className="w-full px-6 pb-24 pt-12 md:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-12">
            <h2 className="text-elevaNeutral-900/70 font-mono text-xs/5 font-semibold uppercase tracking-widest">
              Top Experts
            </h2>
            <h3 className="text-seco text-elevaPrimary mt-2 text-pretty font-serif text-4xl font-light tracking-tighter sm:text-6xl">
              Access to the best has never been easier
            </h3>
          </div>

          <Carousel
            className="mt-12"
            opts={{
              align: 'start',
              loop: false,
            }}
          >
            <CarouselContent className="-ml-4">
              {expertsWithPricing.map((expert) => (
                <CarouselItem key={expert.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <Link href={`/${expert.username}`}>
                    <Card className="border-elevaNeutral-200 relative flex aspect-[9/15] overflow-hidden rounded-3xl">
                      <CardContent className="flex flex-col items-center justify-end p-0">
                        <Image
                          src={expert.image}
                          alt={expert.name || ''}
                          width={1200}
                          height={1200}
                          className="absolute inset-x-0 top-0 aspect-[3/4] w-full object-cover"
                        />
                        <div
                          aria-hidden="true"
                          className="from-elevaNeutral-900 absolute inset-0 top-0 z-20 h-full w-full rounded-3xl bg-gradient-to-t from-25% to-40%"
                        />
                        <div className="relative z-20 p-10">
                          <div className="mb-4">
                            <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-black">
                              Top Expert
                            </span>
                          </div>
                          <div className="border-elevaNeutral-100/20 mt-6 border-t pt-6">
                            <h3 className="text-elevaNeutral-100 text-lg/6 font-medium">
                              {expert.name}
                            </h3>
                            <p className="text-elevaNeutral-100/80 text-sm/6">{expert.headline}</p>
                            <p className="text-elevaNeutral-100/60 mt-2 text-sm/6">
                              {expert.price}
                            </p>
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-amber-400">★★★★★</span>
                              <span className="text-elevaNeutral-100 text-sm">{expert.rating}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="absolute right-12 mt-8 flex h-10 w-6 flex-row items-end justify-end">
              <CarouselPrevious className="h-12 w-12" />
              <CarouselNext className="h-12 w-12" />
            </div>
          </Carousel>
        </div>
      </section>
    </FadeInSection>
  );
};

export default ExpertsSection;
