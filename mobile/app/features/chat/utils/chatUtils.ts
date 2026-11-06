import type { InlineSegment, MessageLine } from '../types/chat';

/** A random v4 UUID; the API only accepts UUIDs as conversation ids. */
export function createId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

/** Splits `**bold**` runs out of a line of text. */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });
  return segments;
}

/**
 * The small slice of Markdown the assistant is asked to use: paragraphs, bullet and numbered
 * lists, and bold. Headings are shown as bold paragraphs.
 */
export function parseMessage(content: string): MessageLine[] {
  const lines: MessageLine[] = [];
  for (const raw of content.trim().split('\n')) {
    const line = raw.trim();
    if (!line) {
      if (lines.length > 0 && lines[lines.length - 1].kind !== 'spacer') lines.push({ kind: 'spacer' });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^(\d+[.)])\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (bullet) {
      lines.push({ kind: 'bullet', marker: '•', segments: parseInline(bullet[1]) });
    } else if (numbered) {
      lines.push({ kind: 'bullet', marker: numbered[1], segments: parseInline(numbered[2]) });
    } else if (heading) {
      lines.push({ kind: 'paragraph', segments: [{ text: heading[1].replace(/\*\*/g, ''), bold: true }] });
    } else {
      lines.push({ kind: 'paragraph', segments: parseInline(line) });
    }
  }
  return lines;
}
