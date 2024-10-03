import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { validateBitcoinAddress } from '../../../utils/validateBitcoinAddress';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!validateBitcoinAddress(address)) {
      return NextResponse.json({ error: 'Invalid Bitcoin address' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        address,
      },
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedUser = JSON.parse(JSON.stringify(user, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(serializedUser);
  } catch (error) {
    console.error('Error adding user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('address')) {
      return NextResponse.json({ error: 'Bitcoin address already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}