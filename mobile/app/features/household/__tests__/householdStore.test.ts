import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { ApiError } from '@/app/shared/services/apiClient';
import { householdService } from '../services/householdService';
import { useHouseholdStore } from '../store/householdStore';
import type { Household } from '../types/household';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../services/householdService', () => ({
  householdService: {
    get: jest.fn(),
    create: jest.fn(),
    join: jest.fn(),
    addMember: jest.fn(),
    leave: jest.fn(),
    removeMember: jest.fn(),
  },
}));

const service = jest.mocked(householdService);
const store = () => useHouseholdStore.getState();
const household = { id: 'h1', name: 'Home', members: [], myRole: 'admin' } as unknown as Household;

describe('household store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    store().clear();
  });

  it('shows no household after loading for someone without one', async () => {
    service.get.mockResolvedValue(null);
    await store().load();
    expect(store()).toMatchObject({ household: null, isLoading: false, loadError: null });
  });

  it('keeps what it has if a refresh fails', async () => {
    useHouseholdStore.setState({ household });
    service.get.mockRejectedValue(new ApiError('Can’t reach PrepPros.'));
    await store().load();
    expect(store()).toMatchObject({ household, loadError: 'Can’t reach PrepPros.' });
  });

  it('creating shows the new household', async () => {
    service.create.mockResolvedValue(household);
    await store().create('Home');
    expect(store().household).toEqual(household);
  });

  it('adding someone shows the household the server sends back', async () => {
    const updated = { ...household, name: 'Home with Asha' };
    useHouseholdStore.setState({ household });
    service.addMember.mockResolvedValue(updated);
    await store().addMember('asha@example.com');
    expect(service.addMember).toHaveBeenCalledWith('asha@example.com');
    expect(store().household).toEqual(updated);
  });

  it('a refused add leaves the household as it was and reaches the form', async () => {
    useHouseholdStore.setState({ household });
    service.addMember.mockRejectedValue(new ApiError('No PrepPros account uses this email.'));
    await expect(store().addMember('nobody@example.com')).rejects.toThrow('No PrepPros account');
    expect(store().household).toEqual(household);
  });

  it('joining clears the invite waiting from a link', async () => {
    useHouseholdStore.setState({ pendingInviteCode: 'ABCD2345' });
    service.join.mockResolvedValue(household);
    await store().join('ABCD2345');
    expect(store()).toMatchObject({ household, pendingInviteCode: null });
  });

  it('a failed join keeps the invite so it can be retried', async () => {
    useHouseholdStore.setState({ pendingInviteCode: 'ABCD2345' });
    service.join.mockRejectedValue(new ApiError('This household is full'));
    await expect(store().join('ABCD2345')).rejects.toThrow('full');
    expect(store().pendingInviteCode).toBe('ABCD2345');
  });

  it('leaving empties the household', async () => {
    useHouseholdStore.setState({ household });
    service.leave.mockResolvedValue();
    await store().leave();
    expect(store().household).toBeNull();
  });
});
