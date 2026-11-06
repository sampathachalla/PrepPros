import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { ApiError } from '@/app/shared/services/apiClient';
import { mealPrepService } from '../services/mealPrepService';
import { useMealPrepStore } from '../store/mealPrepStore';
import type { MealPrepPlan } from '../types/mealPrep';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../services/mealPrepService', () => ({
  mealPrepService: { getWeek: jest.fn(), updateDish: jest.fn(), setShoppingCheck: jest.fn() },
}));

const service = jest.mocked(mealPrepService);
const store = () => useMealPrepStore.getState();

const plan = (weekStart = '2026-11-01'): MealPrepPlan => ({
  weekStart,
  fixedDayCount: 1,
  undecidedDayCount: 0,
  dishes: [
    {
      id: 'd1',
      date: '2026-11-05',
      meal: 'dinner',
      name: 'Curry',
      servings: 2,
      memberIds: ['a', 'b'],
      ingredients: ['rice'],
      steps: [],
      prepStatus: 'todo',
    },
  ],
  shopping: [{ key: 'rice', name: 'rice', dishes: [{ name: 'Curry', servings: 2 }], checked: false }],
});

describe('meal prep store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    store().clear();
  });

  it('loads a week', async () => {
    service.getWeek.mockResolvedValue(plan());
    await store().loadWeek('2026-11-01');
    expect(store()).toMatchObject({ isLoading: false, plan: { weekStart: '2026-11-01' } });
  });

  it('won’t let a slow week replace the one now on screen', async () => {
    let finishSlow!: (value: MealPrepPlan) => void;
    service.getWeek.mockReturnValueOnce(new Promise((resolve) => (finishSlow = resolve)));
    service.getWeek.mockResolvedValueOnce(plan('2026-11-08'));

    const slow = store().loadWeek('2026-11-01');
    await store().loadWeek('2026-11-08');
    finishSlow(plan('2026-11-01'));
    await slow;

    expect(store().plan?.weekStart).toBe('2026-11-08');
  });

  it('updates a dish at once and sends it', async () => {
    useMealPrepStore.setState({ plan: plan() });
    service.updateDish.mockResolvedValue();

    await store().setPrepStatus('d1', 'in_progress');

    expect(service.updateDish).toHaveBeenCalledWith('d1', { prepStatus: 'in_progress' });
    expect(store().plan?.dishes[0].prepStatus).toBe('in_progress');
  });

  it('claims and releases a dish', async () => {
    useMealPrepStore.setState({ plan: plan() });
    service.updateDish.mockResolvedValue();

    await store().assignCook('d1', 'a');
    expect(store().plan?.dishes[0].assigneeId).toBe('a');

    await store().assignCook('d1', null);
    expect(service.updateDish).toHaveBeenLastCalledWith('d1', { assigneeId: null });
    expect(store().plan?.dishes[0].assigneeId).toBeUndefined();
  });

  it('puts things back if the server refuses', async () => {
    useMealPrepStore.setState({ plan: plan() });
    service.updateDish.mockRejectedValue(new ApiError('This day isn’t fixed yet'));

    await expect(store().setPrepStatus('d1', 'done')).rejects.toThrow();

    expect(store().plan?.dishes[0].prepStatus).toBe('todo');
  });

  it('ticks shopping items for the week showing', async () => {
    useMealPrepStore.setState({ plan: plan() });
    service.setShoppingCheck.mockResolvedValue();

    await store().toggleShoppingItem('rice');

    expect(service.setShoppingCheck).toHaveBeenCalledWith('2026-11-01', 'rice', true);
    expect(store().plan?.shopping[0].checked).toBe(true);
  });
});
