import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, ExternalLink } from 'lucide-react';

interface Research {
  authors: string;
  year: string;
  doi: string;
  title: string;
}

interface ReferencesSectionProps {
  references: Research[];
}

export default function ReferencesSection({ references }: ReferencesSectionProps) {
  return (
    <section className="container mx-auto px-4 pb-16 pt-8">
      <div className="mx-auto max-w-5xl">
        {/* Subtle, Collapsible Reference List - Closed by default */}
        <Accordion type="single" collapsible>
          <AccordionItem
            value="references"
            className="rounded-lg border border-eleva-neutral-200/60 bg-eleva-neutral-100/50"
          >
            <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-eleva-neutral-900/40" />
                <div>
                  <h3 className="text-sm font-medium text-eleva-neutral-900/70">
                    References ({references.length})
                  </h3>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <ol className="space-y-3 text-sm">
                {references.map((paper, idx) => (
                  <li key={idx} className="flex gap-3 text-eleva-neutral-900/70">
                    <span className="flex-shrink-0 font-medium text-eleva-neutral-900/50">
                      [{idx + 1}]
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-eleva-neutral-900/80">{paper.title}</p>
                      <p className="mt-1 text-xs text-eleva-neutral-900/60">
                        {paper.authors} ({paper.year})
                      </p>
                      <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-eleva-primary/70 hover:text-eleva-primary hover:underline"
                        aria-label={`Read full paper: ${paper.title} (opens in new tab)`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>doi.org/{paper.doi}</span>
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}

