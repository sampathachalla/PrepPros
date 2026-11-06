import { dragDirection, swipedPage } from '../utils/swipeUtils';

describe('dragDirection', () => {
  it('reads a clear sideways drag', () => {
    expect(dragDirection(30, 2)).toBe('right');
    expect(dragDirection(-30, 2)).toBe('left');
  });

  it('ignores small movements, so a tap stays a tap', () => {
    expect(dragDirection(5, 0)).toBeNull();
  });

  it('leaves up-and-down drags for scrolling', () => {
    expect(dragDirection(20, 40)).toBeNull();
    expect(dragDirection(20, 15)).toBeNull();
  });
});

describe('swipedPage', () => {
  it('reads which of the three pages the row landed on', () => {
    expect(swipedPage(0, 400)).toBe(-1);
    expect(swipedPage(400, 400)).toBe(0);
    expect(swipedPage(800, 400)).toBe(1);
  });

  it('allows for a landing a fraction of a pixel off', () => {
    expect(swipedPage(400.4, 400)).toBe(0);
    expect(swipedPage(799.7, 400)).toBe(1);
  });
});
