import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

interface ExpertPortraitCardProps {
  imageUrl: string;
  name: string;
  headline?: string;
  category?: string;
  isTopExpert?: boolean;
  isVerified?: boolean;
  topExpertLabel?: string;
  verifiedBadgeAlt?: string;
  profileUrl?: string;
}

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUyMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';

function CardInner({
  imageUrl,
  name,
  headline,
  category,
  isTopExpert,
  isVerified,
  topExpertLabel = 'Featured',
  verifiedBadgeAlt = 'Verified',
}: ExpertPortraitCardProps) {
  return (
    <Card className="h-fit overflow-hidden border-none bg-transparent shadow-none">
      <div className="relative aspect-[28/38] rounded-xl">
        <Image
          src={imageUrl}
          alt={name}
          width={400}
          height={520}
          className="absolute inset-0 h-full w-full rounded-xl object-cover"
          loading="lazy"
          quality={85}
          sizes="(max-width: 767px) 90vw, (max-width: 1023px) 45vw, 320px"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
        {isTopExpert && (
          <div className="absolute bottom-4 left-4">
            <span className="text-eleva-neutral-900 rounded-sm bg-white px-3 py-2 text-base font-medium">
              {topExpertLabel}
            </span>
          </div>
        )}
      </div>

      <CardContent className="space-y-1 px-0 pt-4">
        <h3 className="text-eleva-neutral-900 flex items-center gap-1 text-lg font-semibold">
          {name}
          {isVerified && (
            <Image
              src="/img/expert-verified-icon.svg"
              alt={verifiedBadgeAlt}
              className="h-4 w-4"
              aria-hidden="true"
              width={16}
              height={16}
            />
          )}
        </h3>
        {headline && <p className="text-eleva-neutral-900/80 text-sm font-light">{headline}</p>}
        {category && <p className="text-eleva-neutral-900/60 text-xs font-light">{category}</p>}
      </CardContent>
    </Card>
  );
}

export function ExpertPortraitCard(props: ExpertPortraitCardProps) {
  if (props.profileUrl) {
    return (
      <Link href={props.profileUrl} className="group block">
        <CardInner {...props} />
      </Link>
    );
  }

  return <CardInner {...props} />;
}
