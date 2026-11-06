import { createId, parseInline, parseMessage } from '../utils/chatUtils';
import { validateChatMessage } from '../validators/chatValidators';

describe('parseInline', () => {
  it('splits bold runs from plain text', () => {
    expect(parseInline('Try the **Chicken Bowl** tonight')).toEqual([
      { text: 'Try the ', bold: false },
      { text: 'Chicken Bowl', bold: true },
      { text: ' tonight', bold: false },
    ]);
  });

  it('leaves unmatched asterisks as text', () => {
    expect(parseInline('5 * 3 **unclosed')).toEqual([{ text: '5 * 3 **unclosed', bold: false }]);
  });
});

describe('parseMessage', () => {
  it('reads paragraphs, bullet and numbered lists, and collapses blank lines', () => {
    const lines = parseMessage('Here are ideas:\n\n\n- **Oats**\n* Eggs\n2) Rice\n### Tips');
    expect(lines.map((line) => line.kind)).toEqual(['paragraph', 'spacer', 'bullet', 'bullet', 'bullet', 'paragraph']);
    expect(lines[2]).toEqual({ kind: 'bullet', marker: '•', segments: [{ text: 'Oats', bold: true }] });
    expect(lines[4]).toEqual({ kind: 'bullet', marker: '2)', segments: [{ text: 'Rice', bold: false }] });
    expect(lines[5]).toEqual({ kind: 'paragraph', segments: [{ text: 'Tips', bold: true }] });
  });
});

describe('createId', () => {
  it('creates v4 UUIDs', () => {
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('validateChatMessage', () => {
  it('trims the message', () => {
    expect(validateChatMessage('  Hi  ')).toEqual({ ok: true, message: 'Hi' });
  });

  it('rejects blank and overlong messages', () => {
    expect(validateChatMessage('   ').ok).toBe(false);
    expect(validateChatMessage('a'.repeat(4001)).ok).toBe(false);
  });
});
