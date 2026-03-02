'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

interface PackPurchaseCardProps {
  pack: {
    id: string;
    name: string;
    description: string | null;
    sessionsCount: number;
    price: number;
    expirationDays: number | null;
    event: {
      name: string;
      slug: string;
      price: number;
      durationInMinutes: number;
    };
  };
}

export function PackPurchaseCard({ pack }: PackPurchaseCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');

  const individualTotal = pack.event.price * pack.sessionsCount;
  const savings = individualTotal > 0 ? individualTotal - pack.price : 0;
  const savingsPercent = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handlePurchase() {
    if (!email || !isValidEmail) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-pack-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: pack.id,
          buyerEmail: email,
          buyerName: name,
          locale: document.documentElement.lang || 'en',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-2 transition-colors duration-200 hover:border-primary/50">
      <div className="p-6">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-bold">{pack.name}</h3>
          </div>
          {savings > 0 && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Save {savingsPercent}%
            </span>
          )}
        </div>

        {pack.description && (
          <p className="mb-4 text-sm text-muted-foreground">{pack.description}</p>
        )}

        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Event:</span>
            <span className="font-medium">{pack.event.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sessions:</span>
            <span className="font-medium">{pack.sessionsCount}</span>
          </div>
          {pack.expirationDays && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid for:</span>
              <span className="font-medium">{pack.expirationDays} days</span>
            </div>
          )}
          {savings > 0 && (
            <div className="flex justify-between text-green-600">
              <span>You save:</span>
              <span className="font-medium">€{(savings / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="mb-4 text-center">
          <div className="text-3xl font-bold">
            €
            {(pack.price / 100).toLocaleString('pt-PT', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </div>
          {individualTotal > 0 && pack.price < individualTotal && (
            <div className="text-sm text-muted-foreground line-through">
              €{(individualTotal / 100).toFixed(2)}
            </div>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              Buy Pack
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase {pack.name}</DialogTitle>
              <DialogDescription>
                Enter your details to purchase this pack of {pack.sessionsCount} sessions.
                You&apos;ll receive a promo code by email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="buyer-name">Name</Label>
                <Input
                  id="buyer-name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer-email">Email *</Label>
                <Input
                  id="buyer-email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePurchase} disabled={isLoading || !email || !isValidEmail}>
                {isLoading ? 'Processing...' : `Pay €${(pack.price / 100).toFixed(2)}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
