import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { env } from '@/env';
import { retryFailedNotifications } from '@/server/notify/dispatch';

export async function POST(request: NextRequest) {
  if (env.cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const retried = await retryFailedNotifications();

  return NextResponse.json({ retried });
}
