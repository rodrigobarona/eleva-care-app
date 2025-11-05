/**
 * Sign-Out Route
 *
 * Handles user sign-out by clearing the session cookie.
 */
import { clearSession } from '@/lib/auth/workos-session';
import { NextResponse } from 'next/server';

export async function GET() {
  await clearSession();
  return NextResponse.redirect(new URL('/sign-in', 'http://localhost:3000'));
}

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
