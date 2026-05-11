import '@testing-library/jest-dom/vitest';

// JSDOM doesn't implement EventSource; stub for component tests.
class EventSourceStub {
  onopen: ((this: EventSourceStub, ev: Event) => unknown) | null = null;
  onerror: ((this: EventSourceStub, ev: Event) => unknown) | null = null;
  onmessage: ((this: EventSourceStub, ev: MessageEvent) => unknown) | null = null;
  constructor(_url: string) {}
  close() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).EventSource = EventSourceStub;
