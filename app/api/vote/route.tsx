import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { team } = body;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    console.log('Vote request:', { team, ip });

    // ✅ IP rate limiting removed for load testing

    if (team && !['pradhan', 'banrakas'].includes(team)) {
      console.log('Invalid team:', team);
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
    }

    // Update votes if a team is provided
    if (team) {
      await redis.hincrby('votes', team, 1);
      console.log('Vote recorded for:', team);
    }

    // Fetch current vote counts
    const [pradhan, banrakas] = await Promise.all([
      redis.hget('votes', 'pradhan').then((val) => Number(val) || 0),
      redis.hget('votes', 'banrakas').then((val) => Number(val) || 0),
    ]);
    const voteData = { pradhan, banrakas };
    console.log('Current vote counts:', voteData);

    // Trigger Pusher event
    if (team) {
      await pusher.trigger('vote-channel', 'vote_update', voteData);
      console.log('Triggered Pusher vote_update:', voteData);
    }

    return NextResponse.json(voteData);
  } catch (error) {
    console.error('Error in /api/vote:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
