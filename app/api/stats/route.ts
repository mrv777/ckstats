import { NextResponse } from 'next/server';
import { getLatestPoolStats } from '../../../lib/api';

export async function GET() {
  try {
    const stats = await getLatestPoolStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}