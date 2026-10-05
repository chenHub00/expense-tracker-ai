import type { Category, Expense } from '../types';
import type { Report } from './reports';

/** Compact, versioned snapshot that travels inside a share link. */
export interface SharePayload {
  v: 1;
  title: string;
  period: string;
  generatedAt: string;
  /** ISO timestamp after which the viewer refuses to show the data; null never expires. */
  expiresAt: string | null;
  hideDescriptions: boolean;
  /** [date, category, amount, description] */
  rows: Array<[string, Category, number, string]>;
}

export function toSharePayload(report: Report, expiresAt: string | null, hideDescriptions: boolean): SharePayload {
  return {
    v: 1,
    title: report.title,
    period: report.period,
    generatedAt: report.generatedAt,
    expiresAt,
    hideDescriptions,
    rows: report.rows.map((e: Expense) => [e.date, e.category, e.amount, hideDescriptions ? '' : e.description]),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Encodes the snapshot into a URL-safe string. The data lives in the link's #fragment,
 * which browsers never send to a server, so sharing needs no backend.
 */
export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodeShare(token: string): Promise<SharePayload> {
  const json = await pipe(fromBase64Url(token), new DecompressionStream('deflate-raw'));
  const payload = JSON.parse(new TextDecoder().decode(json)) as SharePayload;
  if (payload?.v !== 1 || !Array.isArray(payload.rows)) throw new Error('Unsupported link format');
  return payload;
}
