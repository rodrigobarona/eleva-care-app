/**
 * Sign-Out Route (AuthKit)
 *
 * Handles user sign-out using WorkOS AuthKit.
 */
import { signOut } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  // Sign out using AuthKit (clears session cookies)
  await signOut();

  // Redirect to sign-in page
  return NextResponse.redirect(
    new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  );
}

export async function POST() {
  // Sign out using AuthKit
  await signOut();

  // Return JSON response for API clients
  return NextResponse.json({ success: true });
}
