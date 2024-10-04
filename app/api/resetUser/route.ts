import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/api';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { address },
      data: { isActive: true },
    });

    return NextResponse.json({ message: 'User reset successfully', user: address });
  } catch (error) {
    console.error('Error resetting user:', error);
    return NextResponse.json({ error: 'Failed to reset user' }, { status: 500 });
  }
}