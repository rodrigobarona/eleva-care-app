import { HelpCircle } from 'lucide-react';

interface SupportFooterProps {
  text: string;
  contactUrl?: string;
  contactLabel?: string;
}

export function SupportFooter({ text, contactUrl, contactLabel }: SupportFooterProps) {
  return (
    <div className="text-muted-foreground mt-12 flex items-center justify-center gap-2 text-sm">
      <HelpCircle className="h-4 w-4" />
      <span>{text}</span>
      {contactUrl && contactLabel && (
        <a
          href={contactUrl}
          className="text-eleva-primary font-medium underline-offset-4 hover:underline"
        >
          {contactLabel}
        </a>
      )}
    </div>
  );
}
