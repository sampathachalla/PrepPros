import { importTimerLabel } from '../utils/importTimer';

describe('importTimerLabel', () => {
  it('counts down from the average', () => {
    expect(importTimerLabel(65, 0)).toBe('About 1:05 left (avg 1:05)');
    expect(importTimerLabel(65, 56)).toBe('About 0:09 left (avg 1:05)');
  });

  it('says so instead of sitting at zero when an import runs long', () => {
    expect(importTimerLabel(33, 33)).toBe('Taking longer than usual (avg 0:33)');
    expect(importTimerLabel(33, 400)).toBe('Taking longer than usual (avg 0:33)');
  });
});
