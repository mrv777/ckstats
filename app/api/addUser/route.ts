import { NextRequest, NextResponse } from 'next/server';
import { updateSingleUser } from '../../../lib/api';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    console.log('Adding user:', address);
    await updateSingleUser(address);
    return NextResponse.json({ message: 'User added and stats updated successfully', user: address });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
  }
}