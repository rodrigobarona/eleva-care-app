import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';

export default async function PackPurchaseSuccessPage() {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pack Purchased Successfully!</CardTitle>
          <CardDescription className="text-base">
            Your session pack has been purchased. Check your email for the promo code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <span>
                We&apos;ve sent your promotion code to your email. Use it at checkout when booking
                individual sessions.
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">What happens next?</h3>
            <ol className="space-y-2 text-left text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                Check your email for the promo code
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                Book a session with your expert
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                Enter the promo code at checkout for a free session
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                Repeat until all sessions are used!
              </li>
            </ol>
          </div>

          <Button asChild className="w-full">
            <Link href="/">Browse Experts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
