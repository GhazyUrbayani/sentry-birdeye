import { Client as QStashClient } from '@upstash/qstash';
import type { TelegramAlertMessage } from '@/types';

type PublishRequest = {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  delay: number; // seconds
};

type PublishResult = { ok: true } | { ok: false; error: { message: string; cause?: unknown } };

export interface TelegramQueue {
  enqueue(msg: TelegramAlertMessage): Promise<PublishResult>;
}

/**
 * Leaky bucket queue implemented via QStash scheduled delivery.
 * We approximate constant drain by monotonically assigning increasing delays.
 */
export class QStashLeakyBucketQueue implements TelegramQueue {
  private readonly drainPerSecond: number;
  private readonly publish: (req: PublishRequest) => Promise<PublishResult>;
  private readonly nowMs: () => number;
  private readonly telegramToken?: string;

  private nextAvailableMs: number;

  constructor(input: {
    drainPerSecond: number; // 25
    publish?: (req: PublishRequest) => Promise<PublishResult>;
    nowMs?: () => number;
    telegramToken?: string;
  }) {
    this.drainPerSecond = input.drainPerSecond;
    this.nowMs = input.nowMs ?? (() => Date.now());
    this.nextAvailableMs = this.nowMs();
    this.telegramToken = input.telegramToken;

    this.publish =
      input.publish ??
      (async (req) => {
        const token = process.env['QSTASH_TOKEN'];
        if (!token) return { ok: false, error: { message: 'QSTASH_TOKEN missing' } };

        const client = new QStashClient({ token });
        try {
          await client.publishJSON({
            url: req.url,
            body: req.body,
            headers: req.headers,
            delay: req.delay,
          });
          return { ok: true };
        } catch (cause) {
          return { ok: false, error: { message: 'QStash publish failed', cause } };
        }
      });
  }

  async enqueue(msg: TelegramAlertMessage): Promise<PublishResult> {
    const telegramToken = this.telegramToken ?? process.env['TELEGRAM_BOT_TOKEN'];
    if (!telegramToken) return { ok: false, error: { message: 'TELEGRAM_BOT_TOKEN missing' } };

    const spacingMs = Math.ceil(1000 / this.drainPerSecond); // 40ms at 25 msg/sec
    const now = this.nowMs();
    const scheduled = Math.max(now, this.nextAvailableMs);
    this.nextAvailableMs = scheduled + spacingMs;

    const delaySeconds = Math.max(0, Math.floor((scheduled - now) / 1000));

    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const body = {
      chat_id: msg.chatId,
      text: msg.text,
      parse_mode: msg.parseMode,
      disable_web_page_preview: msg.disableWebPagePreview ?? true,
    };

    return await this.publish({ url, body, delay: delaySeconds });
  }
}

