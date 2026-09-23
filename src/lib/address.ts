import type { KeyboardEvent } from 'react';

/**
 * Collapses newlines/tabs/runs of whitespace in an address into single
 * spaces and trims the result. Addresses must stay single-line because
 * JNE's airwaybill API silently fails to generate a resi when a receiver
 * address field contains raw newline characters (e.g. pasted or typed with
 * Enter).
 */
export function sanitizeAddress(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Prevents Enter from inserting a newline in an address textarea. */
export function blockNewlineKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
}
