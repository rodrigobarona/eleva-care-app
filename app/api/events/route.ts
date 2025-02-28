import { db } from '@/drizzle/db';
import { EventTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Fetch events from the database for the current user
    const events = await db.query.EventTable.findMany({
      where: eq(EventTable.clerkUserId, userId),
      orderBy: [desc(EventTable.order)],
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch events' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Calculate next order value
    const highestOrderEvent = await db.query.EventTable.findFirst({
      where: eq(EventTable.clerkUserId, userId),
      orderBy: [desc(EventTable.order)],
    });

    const nextOrder = highestOrderEvent ? highestOrderEvent.order + 1 : 0;

    // Create a Stripe product and price if pricing is enabled
    let stripeProductId = null;
    let stripePriceId = null;

    if (body.price > 0) {
      // Import the getServerStripe helper
      const { getServerStripe } = await import('@/lib/stripe');
      const stripe = await getServerStripe();

      // Create a Stripe product
      const product = await stripe.products.create({
        name: body.name,
        description: body.description || undefined,
        metadata: {
          eventType: 'appointment',
          clerkUserId: userId,
        },
      });

      // Create a Stripe price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(body.price * 100), // Convert to cents
        currency: body.currency || 'eur',
      });

      stripeProductId = product.id;
      stripePriceId = price.id;
    }

    // Insert the event into the database
    const [newEvent] = await db
      .insert(EventTable)
      .values({
        name: body.name,
        slug:
          body.slug ||
          body.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
        description: body.description,
        durationInMinutes: body.durationInMinutes,
        clerkUserId: userId,
        isActive: true,
        order: nextOrder,
        price: body.price || 0,
        currency: body.currency || 'eur',
        stripeProductId,
        stripePriceId,
      })
      .returning();

    return NextResponse.json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create event' },
      { status: 500 },
    );
  }
}
