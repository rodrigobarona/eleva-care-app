import React from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin, Instagram, Facebook, Twitter, BookOpen } from 'lucide-react';
import Link from 'next/link';
import FadeInSection from '@/components/ui/FadeInSection';

interface SocialSectionProps {
  title: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  twitter: string;
  scholar: string;
}

const SocialSection: React.FC<SocialSectionProps> = ({
  title,
  linkedin,
  instagram,
  facebook,
  twitter,
  scholar,
}) => {
  return (
    <FadeInSection>
      <section className="w-full bg-[#f0f8f8] px-6 py-12 md:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tighter text-elevaPrimary sm:text-4xl">
            {title}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              className="border-[#0d6c70] text-elevaPrimary hover:bg-[#0d6c70] hover:text-elevaNeutral-100"
              asChild
            >
              <Link
                href="https://www.linkedin.com/in/patimota/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="mr-2 h-4 w-4" />
                {linkedin}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#0d6c70] text-elevaPrimary hover:bg-[#0d6c70] hover:text-elevaNeutral-100"
              asChild
            >
              <Link
                href="https://www.instagram.com/patricia_mota_pt_phd/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="mr-2 h-4 w-4" />
                {instagram}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#0d6c70] text-elevaPrimary hover:bg-[#0d6c70] hover:text-elevaNeutral-100"
              asChild
            >
              <Link
                href="https://facebook.com/eleva.care"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="mr-2 h-4 w-4" />
                {facebook}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#0d6c70] text-elevaPrimary hover:bg-[#0d6c70] hover:text-elevaNeutral-100"
              asChild
            >
              <Link href="https://x.com/eleva.care" target="_blank" rel="noopener noreferrer">
                <Twitter className="mr-2 h-4 w-4" />
                {twitter}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#0d6c70] text-elevaPrimary hover:bg-[#0d6c70] hover:text-elevaNeutral-100"
              asChild
            >
              <Link
                href="https://scholar.google.pt/citations?user=fNJsrScAAAAJ"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {scholar}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default SocialSection;
