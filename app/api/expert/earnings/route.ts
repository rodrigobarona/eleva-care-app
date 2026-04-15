import { isExpert } from '@/lib/auth/roles.server';
import { getExpertEarningsDashboardData } from '@/server/earnings';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

function parseYear(value: string | null) {
  const parsed = Number.parseInt(value || '', 10);
  const currentYear = new Date().getUTCFullYear();

  if (Number.isNaN(parsed)) {
    return currentYear;
  }

  return Math.min(Math.max(parsed, 2024), currentYear + 1);
}

function parseMonth(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1 || parsed > 12) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isExpert())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const year = parseYear(request.nextUrl.searchParams.get('year'));
  const month = parseMonth(request.nextUrl.searchParams.get('month'));

  try {
    const data = await getExpertEarningsDashboardData({
      clerkUserId: userId,
      year,
      month,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Failed to load expert earnings data:', error);
    return NextResponse.json(
      {
        error: 'Failed to load earnings data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
