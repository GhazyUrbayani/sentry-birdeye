import { ConvexHttpClient } from 'convex/browser';

type FunctionName = `${string}:${string}`;

function getConvexUrl(): string {
  const url = process.env['CONVEX_URL'] ?? process.env['NEXT_PUBLIC_CONVEX_URL'];
  if (!url) throw new Error('Missing env var: NEXT_PUBLIC_CONVEX_URL');
  return url;
}

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!client) client = new ConvexHttpClient(getConvexUrl());
  return client;
}

export async function convexQuery<T>(name: FunctionName, args: Record<string, unknown>): Promise<T> {
  // Convex expects typed function refs; string names avoid codegen in this repo.
  return getClient().query(name as never, args) as Promise<T>;
}

export async function convexMutation<T>(name: FunctionName, args: Record<string, unknown>): Promise<T> {
  return getClient().mutation(name as never, args) as Promise<T>;
}
