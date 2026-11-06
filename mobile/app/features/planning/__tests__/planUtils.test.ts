import type { CategoryDishes, ScheduledDish } from '../../calendar/types/calendar';
import { firstDayOfNextWeek, picksToCopy, waitingSuggestions } from '../utils/planUtils';

const dish = (partial: Partial<ScheduledDish>): ScheduledDish => ({
  id: 'd',
  name: 'Dish',
  category: 'dinner',
  date: '2026-11-08',
  isSuggestion: true,
  status: 'pending',
  memberIds: [],
  createdAt: '',
  ...partial,
});

const day = (partial: Partial<CategoryDishes>): CategoryDishes => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
  ...partial,
});

describe('firstDayOfNextWeek', () => {
  it('finds the coming Sunday', () => {
    expect(firstDayOfNextWeek('2026-11-06')).toBe('2026-11-08');
  });

  it('moves on a full week when today is already Sunday', () => {
    expect(firstDayOfNextWeek('2026-11-08')).toBe('2026-11-15');
  });
});

describe('waitingSuggestions', () => {
  it('lists only what is waiting, by day and then meal', () => {
    const dishes = {
      '2026-11-09': day({ dinner: [dish({ id: 'later' })], lunch: [dish({ id: 'approved', status: 'approved' })] }),
      '2026-11-08': day({ dinner: [dish({ id: 'dinner' })], breakfast: [dish({ id: 'breakfast' })] }),
    };
    const ids = waitingSuggestions(dishes, ['2026-11-08', '2026-11-09']).map(({ id }) => id);
    expect(ids).toEqual(['breakfast', 'dinner', 'later']);
  });

  it('copes with a day that has nothing', () => {
    expect(waitingSuggestions({}, ['2026-11-08'])).toEqual([]);
  });
});

describe('picksToCopy', () => {
  it('takes this person’s dishes, leaving out declined ones and everyone else’s', () => {
    const dishes = {
      '2026-11-01': day({
        lunch: [
          dish({ id: 'mine', addedById: 'me' }),
          dish({ id: 'approved', addedById: 'me', status: 'approved' }),
          dish({ id: 'declined', addedById: 'me', status: 'declined' }),
          dish({ id: 'theirs', addedById: 'them' }),
        ],
      }),
    };
    expect(picksToCopy(dishes, ['2026-11-01'], 'me').map(({ id }) => id)).toEqual(['mine', 'approved']);
  });
});
