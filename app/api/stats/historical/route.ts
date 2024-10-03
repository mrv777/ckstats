import { NextResponse } from 'next/server';
import { getHistoricalPoolStats } from '../../../../lib/api';

export async function GET() {
  try {
    const stats = await getHistoricalPoolStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}