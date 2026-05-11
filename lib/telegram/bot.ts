import type { TelegramAlertMessage, TokenFlag, Grade, SolanaAddress } from '@/types';

export function formatAlertMessage(input: {
  address: SolanaAddress;
  symbol?: string | null;
  grade: Grade;
  score: number;
  flags: TokenFlag[];
  appUrl: string;
}): TelegramAlertMessage {
  const symbol = input.symbol ?? 'UNKNOWN';
  const grade = input.grade;
  const score = input.score;
  const flags = input.flags.length ? input.flags.join(', ') : 'none';

  const link = `${input.appUrl.replace(/\/$/, '')}/?token=${encodeURIComponent(input.address)}`;

  const text = [
    `SENTRY ALERT`,
    ``,
    `Token: ${symbol}`,
    `Grade: ${grade} (${score}/100)`,
    `Flags: ${flags}`,
    ``,
    `View: ${link}`,
  ].join('\n');

  return {
    chatId: 0,
    text,
    parseMode: undefined,
    disableWebPagePreview: true,
  };
}

export async function sendTelegramMessage(input: {
  token: string;
  message: TelegramAlertMessage;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; messageId: number } | { ok: false; error: { message: string; cause?: unknown } }> {
  const f = input.fetchImpl ?? fetch;
  const url = `https://api.telegram.org/bot${input.token}/sendMessage`;

  try {
    const res = await f(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: input.message.chatId,
        text: input.message.text,
        parse_mode: input.message.parseMode,
        disable_web_page_preview: input.message.disableWebPagePreview ?? true,
      }),
    });

    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok || !json || typeof json !== 'object') {
      return { ok: false, error: { message: `Telegram HTTP error: ${res.status}` } };
    }

    const maybe = json as { ok?: unknown; result?: { message_id?: unknown } };
    if (maybe.ok !== true) return { ok: false, error: { message: 'Telegram returned ok=false' } };
    const msgId = maybe.result?.message_id;
    if (typeof msgId !== 'number') return { ok: false, error: { message: 'Telegram response missing message_id' } };

    return { ok: true, messageId: msgId };
  } catch (cause) {
    return { ok: false, error: { message: 'Telegram network error', cause } };
  }
}

