import { NextRequest, NextResponse } from 'next/server';

// In-memory subscription store (use database in production)
const subscriptions = new Map<string, PushSubscription>();

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }

    // Store subscription
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64').slice(0, 32);
    subscriptions.set(subscriptionId, {
      ...subscription,
      userId,
    });

    return NextResponse.json({
      success: true,
      subscriptionId,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, endpoint } = body;

    if (subscriptionId) {
      subscriptions.delete(subscriptionId);
    } else if (endpoint) {
      const id = Buffer.from(endpoint).toString('base64').slice(0, 32);
      subscriptions.delete(id);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

// GET - Get subscription status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({
      subscriptionCount: subscriptions.size,
    });
  }

  const subscriptionId = Buffer.from(endpoint).toString('base64').slice(0, 32);
  const isSubscribed = subscriptions.has(subscriptionId);

  return NextResponse.json({
    subscribed: isSubscribed,
  });
}
