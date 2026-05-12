import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convex/client';
import { sendTelegramMessage } from '@/lib/telegram/bot';

export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Construct the webhook URL dynamically based on the current Vercel host
  const webhookUrl = `${url.protocol}//${url.host}/api/telegram`;
  
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not set in environment variables.' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await res.json();
    return NextResponse.json({ 
      status: 'Webhook Registration Attempt', 
      webhookUrl, 
      telegramResponse: data 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to contact Telegram API' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const update = (await req.json().catch(() => ({}))) as any;

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const username = update.message.from?.username || update.message.from?.first_name || 'Trader';

      if (text.startsWith('/start')) {
        // Save the subscriber to Convex DB
        try {
          await convexMutation('subscribers:upsert', {
            chatId: chatId,
            username: username,
            filter: 'SAFE', // Default filter
            active: true,
          });
        } catch (err) {
          console.error('Failed to save subscriber to DB:', err);
        }

        // Send welcome message
        const token = process.env['TELEGRAM_BOT_TOKEN'];
        if (token) {
          await sendTelegramMessage({
            token,
            message: {
              chatId,
              text: `🚀 Welcome to SENTRY Pre-Trade Intelligence, ${username}!\n\nYou are now subscribed to real-time token alerts.\n\nSENTRY scans new tokens on Solana via Birdeye Data, evaluates risk, and notifies you when a SAFE or DEGEN opportunity is found. Stay tuned!`,
            },
          });
        }
      }
    }

    // Always return 200 OK so Telegram doesn't retry
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
