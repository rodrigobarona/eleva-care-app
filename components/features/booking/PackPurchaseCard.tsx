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

/**
 * Derive a stable SHA-256 hex digest for use as an `Idempotency-Key`. Same
 * input produces the same key, so rapid double-clicks on "Buy Pack" reuse
 * the same key and Stripe returns the same Checkout Session (within its 24h
 * retention window) instead of creating duplicates.
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PackPurchaseCard({ pack }: PackPurchaseCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');

  // Cache the derived idempotency key per (packId, email, dialogSessionId) so
  // rapid double-clicks within a single dialog open reuse the same Stripe key
  // (no duplicate sessions), while closing + re-opening the dialog — or the
  // user returning 24h later to buy the same pack again — generates a fresh
  // nonce and therefore a fresh Checkout Session (Stripe's idempotency cache
  // retains keys for 24h and would otherwise return the prior completed URL).
  const idempotencyKeyCache = React.useRef<{ signature: string; key: string } | null>(null);
  const dialogSessionIdRef = React.useRef<string>(crypto.randomUUID());

  // Roll the dialog-session nonce whenever the dialog closes so the next open
  // produces a fresh idempotency key.
  React.useEffect(() => {
    if (!isOpen) {
      dialogSessionIdRef.current = crypto.randomUUID();
      idempotencyKeyCache.current = null;
    }
  }, [isOpen]);

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
      // Derive the Idempotency-Key from (packId, buyerEmail, dialogSessionId).
      // The dialog-session nonce regenerates on dialog close (see useEffect
      // above) so legitimate re-purchases produce a fresh Checkout Session
      // instead of reusing Stripe's cached completed one within 24h.
      const idempotencySignature = `pack:${pack.id}|${email.toLowerCase().trim()}|${dialogSessionIdRef.current}`;
      let idempotencyKey: string;
      if (idempotencyKeyCache.current?.signature === idempotencySignature) {
        idempotencyKey = idempotencyKeyCache.current.key;
      } else {
        idempotencyKey = await sha256Hex(idempotencySignature);
        idempotencyKeyCache.current = { signature: idempotencySignature, key: idempotencyKey };
      }

      const response = await fetch('/api/create-pack-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          packId: pack.id,
          buyerEmail: email,
          buyerName: name,
          buyerPhone: phone,
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
      <div className="flex flex-col lg:flex-row">
        <div className="flex-grow bg-gray-50 p-6 lg:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-sm font-medium text-white">
            <Package className="h-3.5 w-3.5" />
            Bundle of {pack.sessionsCount} sessions
          </div>

          <h3 className="mb-2 text-2xl font-bold">{pack.name}</h3>

          {pack.description && (
            <p className="mb-4 text-base text-muted-foreground">{pack.description}</p>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Event:</span>
              <span className="text-muted-foreground">{pack.event.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Duration:</span>
              <span className="text-muted-foreground">
                {pack.event.durationInMinutes} min per session
              </span>
            </div>
            {pack.expirationDays && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Valid for:</span>
                <span className="text-muted-foreground">{pack.expirationDays} days</span>
              </div>
            )}
          </div>

          {savings > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-medium text-green-700">
              You save €{(savings / 100).toFixed(2)} ({savingsPercent}%)
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between bg-gray-50 p-6 lg:w-72 lg:border-l lg:p-8">
          <div>
            <div className="mb-1 text-lg font-semibold">Pack</div>
            <div className="mb-1 text-3xl font-bold">
              €{' '}
              {(pack.price / 100).toLocaleString('pt-PT', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </div>
            {individualTotal > 0 && pack.price < individualTotal && (
              <div className="mb-4 text-sm text-muted-foreground line-through">
                €{(individualTotal / 100).toFixed(2)}
              </div>
            )}
            <p className="mb-6 text-sm text-muted-foreground">
              €
              {(pack.price / pack.sessionsCount / 100).toLocaleString('pt-PT', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}{' '}
              per session
            </p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 py-6 text-lg font-semibold text-white hover:bg-blue-700">
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
                <div className="space-y-2">
                  <Label htmlFor="buyer-phone">Phone (optional)</Label>
                  <Input
                    id="buyer-phone"
                    type="tel"
                    placeholder="+351 912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
      </div>
    </Card>
  );
}
