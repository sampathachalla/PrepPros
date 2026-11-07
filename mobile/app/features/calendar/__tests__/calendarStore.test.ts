import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { ApiError } from '@/app/shared/services/apiClient';
import { calendarService } from '../services/calendarService';
import { mergeRange, useCalendarStore } from '../store/calendarStore';
import type { CalendarResponse, ScheduledDish } from '../types/calendar';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../services/calendarService', () => ({
  calendarService: {
    getRange: jest.fn(),
    addDish: jest.fn(),
    removeDish: jest.fn(),
    accept: jest.fn(),
    withdraw: jest.fn(),
    decide: jest.fn(),
    startTimer: jest.fn(),
    fixDay: jest.fn(),
  },
}));

const service = jest.mocked(calendarService);
const store = () => useCalendarStore.getState();

const dish = (id: string, partial: Partial<ScheduledDish> = {}): ScheduledDish => ({
  id,
  name: `Dish ${id}`,
  category: 'dinner',
  date: '2026-11-05',
  isSuggestion: false,
  status: 'approved',
  memberIds: [],
  createdAt: '2026-11-04T10:00:00.000Z',
  ...partial,
});

const response = (dishes: ScheduledDish[], partial: Partial<CalendarResponse> = {}): CalendarResponse => ({
  serverTime: new Date().toISOString(),
  days: [{ date: '2026-11-05', status: 'open', votingEndsAt: '2026-11-05T10:00:00.000Z' }],
  dishes,
  ...partial,
});

describe('calendar store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    store().clear();
  });

  it('starts empty, with no sample meals or people', () => {
    expect(store().dishesByDate).toEqual({});
  });

  it('groups loaded dishes by day and meal', async () => {
    service.getRange.mockResolvedValue(response([dish('a'), dish('b', { category: 'lunch' })]));
    await store().loadRange('2026-11-01', '2026-11-07');

    expect(store().dishesByDate['2026-11-05'].dinner.map((d) => d.id)).toEqual(['a']);
    expect(store().dishesByDate['2026-11-05'].lunch.map((d) => d.id)).toEqual(['b']);
    expect(store().dayStates['2026-11-05'].status).toBe('open');
    expect(store().isLoading).toBe(false);
  });

  it('tells a day that came back empty from one not loaded yet', async () => {
    expect(store().loadedDates['2026-11-02']).toBeUndefined();

    service.getRange.mockResolvedValue(response([]));
    await store().loadRange('2026-11-01', '2026-11-07');

    expect(store().loadedDates['2026-11-02']).toBe(true);
    expect(store().loadedDates['2026-11-08']).toBeUndefined();
  });

  it('forgets what was loaded when cleared', async () => {
    service.getRange.mockResolvedValue(response([]));
    await store().loadRange('2026-11-01', '2026-11-07');
    store().clear();
    expect(store().loadedDates).toEqual({});
  });

  it('drops a dish someone else removed, but keeps days outside the range', () => {
    const before = mergeRange({ dishesByDate: {}, dayStates: {} }, '2026-11-01', '2026-11-30', response([
      dish('a'),
      dish('later', { date: '2026-11-20' }),
    ]));

    const after = mergeRange(before, '2026-11-01', '2026-11-07', response([], { days: [] }));

    expect(after.dishesByDate['2026-11-05']).toBeUndefined();
    expect(after.dayStates['2026-11-05']).toBeUndefined();
    expect(after.dishesByDate['2026-11-20'].dinner).toHaveLength(1);
  });

  it('measures the server clock so countdowns ignore a wrong phone clock', async () => {
    const twoMinutesAhead = new Date(Date.now() + 120_000).toISOString();
    service.getRange.mockResolvedValue(response([], { serverTime: twoMinutesAhead }));
    await store().loadRange('2026-11-01', '2026-11-07');
    expect(store().clockOffsetMs).toBeGreaterThan(119_000);
  });

  it('ignores a slow load once a newer one has answered', async () => {
    let finishSlow!: (value: CalendarResponse) => void;
    service.getRange.mockReturnValueOnce(new Promise((resolve) => (finishSlow = resolve)));
    service.getRange.mockResolvedValueOnce(response([dish('new')]));

    const slow = store().loadRange('2026-11-01', '2026-11-07');
    await store().loadRange('2026-11-01', '2026-11-07');
    finishSlow(response([dish('old')]));
    await slow;

    expect(store().dishesByDate['2026-11-05'].dinner.map((d) => d.id)).toEqual(['new']);
  });

  it('keeps showing the plan when a refresh fails', async () => {
    service.getRange.mockResolvedValueOnce(response([dish('a')]));
    await store().loadRange('2026-11-01', '2026-11-07');

    service.getRange.mockRejectedValueOnce(new ApiError('Can’t reach PrepPros.'));
    await store().reload();

    expect(store().loadError).toBe('Can’t reach PrepPros.');
    expect(store().dishesByDate['2026-11-05'].dinner).toHaveLength(1);
  });

  describe('choosing a dish', () => {
    async function loaded() {
      service.getRange.mockResolvedValueOnce(response([dish('curry', { memberIds: ['me'] }), dish('dal')]));
      await store().loadRange('2026-11-01', '2026-11-07');
      return store().dishesByDate['2026-11-05'].dinner;
    }
    const memberIdsOf = (id: string) =>
      store().dishesByDate['2026-11-05'].dinner.find((d) => d.id === id)?.memberIds;

    it('moves the choice at once, then trusts the server', async () => {
      const [, dal] = await loaded();
      let finish!: (value: ScheduledDish) => void;
      service.accept.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      service.getRange.mockResolvedValue(response([dish('curry'), dish('dal', { memberIds: ['me', 'ravi'] })]));

      const accepting = store().acceptDish(dal, 'me');

      expect(memberIdsOf('curry')).toEqual([]);
      expect(memberIdsOf('dal')).toEqual(['me']);

      finish(dal);
      await accepting;
      expect(memberIdsOf('dal')).toEqual(['me', 'ravi']);
    });

    it('goes back to the server’s answer if the choice is refused', async () => {
      const [, dal] = await loaded();
      service.accept.mockRejectedValue(new ApiError('This day is fixed.'));
      service.getRange.mockResolvedValue(response([dish('curry', { memberIds: ['me'] }), dish('dal')]));

      await expect(store().acceptDish(dal, 'me')).rejects.toThrow('fixed');

      expect(memberIdsOf('curry')).toEqual(['me']);
      expect(memberIdsOf('dal')).toEqual([]);
    });

    it('clears a choice', async () => {
      const [curry] = await loaded();
      service.withdraw.mockResolvedValue(curry);
      service.getRange.mockResolvedValue(response([dish('curry'), dish('dal')]));

      await store().withdrawDish(curry, 'me');

      expect(service.withdraw).toHaveBeenCalledWith('curry');
      expect(memberIdsOf('curry')).toEqual([]);
    });
  });

  it('reloads after a change, so the plan matches the server', async () => {
    service.getRange.mockResolvedValue(response([dish('a')]));
    await store().loadRange('2026-11-01', '2026-11-07');
    service.startTimer.mockResolvedValue({ votingEndsAt: '2026-11-05T10:00:00.000Z' });

    await store().startTimer(['2026-11-05'], 60);

    expect(service.startTimer).toHaveBeenCalledWith(['2026-11-05'], 60);
    expect(service.getRange).toHaveBeenCalledTimes(2);
  });
});
