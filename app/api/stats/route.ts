import { NextResponse } from 'next/server';

import { getLatestPoolStats } from '../../../lib/api';

export async function GET() {
  try {
    const stats = await getLatestPoolStats();

    // Serialize BigInt values to strings
    const serializedStats = JSON.parse(
      JSON.stringify(stats, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json(serializedStats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
