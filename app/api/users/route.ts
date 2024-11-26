import { NextResponse } from 'next/server';
import { MoreThanOrEqual } from 'typeorm';

import { updateSingleUser } from '../../../lib/api';
import { getDb } from '../../../lib/db';
import { User } from '../../../lib/entities/User';
import { validateBitcoinAddress } from '../../../utils/validateBitcoinAddress';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!validateBitcoinAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Bitcoin address' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userRepository = db.getRepository(User);

    // Check if user with the given address already exists
    const existingUser = await userRepository.findOne({
      where: { address },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Already in database' },
        { status: 200 }
      );
    }

    // Check the number of new users created in the last 3 minutes
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const recentUsersCount = await userRepository.count({
      where: {
        createdAt: MoreThanOrEqual(threeMinutesAgo),
      },
    });

    if (recentUsersCount >= 10) {
      console.log('Too many users created recently, user must wait.');
      return NextResponse.json(
        { error: 'Too many users created recently, please try again later.' },
        { status: 429 }
      );
    }

    console.log('Adding user:', address);

    const user = userRepository.create({
      address,
      isActive: true,
      isPublic: true,
      updatedAt: new Date(),
    });

    await userRepository.save(user);

    console.log(
      `User ${address} added to database, updating stats in background.`
    );
    updateSingleUser(address);

    // Convert BigInt fields to strings for JSON serialization
    const serializedUser = JSON.parse(
      JSON.stringify(user, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json(serializedUser);
  } catch (error) {
    console.error('Error adding user:', error);
    // Check for unique constraint violation
    if (error.code === '23505' && error.detail?.includes('address')) {
      return NextResponse.json(
        { error: 'Bitcoin address already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
