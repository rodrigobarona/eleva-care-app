'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import { cn } from '@/lib/utils';
import type React from 'react';

interface SlideOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SlideOverDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: SlideOverDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right fixed right-0 top-0 flex h-full max-w-md translate-x-0 flex-col rounded-l-lg rounded-r-none border-r-0',
          className,
        )}
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-auto p-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
