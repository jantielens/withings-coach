import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function POST() {
  const session = await getSession();
  session.destroy();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(`${baseUrl}/login`, { status: 303 });
}
