import { apiRequest } from '@/app/shared/services/apiClient';
import type { Household } from '../types/household';

interface HouseholdResponse {
  household: Household | null;
}

const send = async (method: string, url: string, data?: object) =>
  (await apiRequest<HouseholdResponse>({ method, url, data })).household;

/** Household Service layer: talks to api/src/modules/household. */
export const householdService = {
  get: () => send('GET', '/household'),
  create: (name: string) => send('POST', '/household', { name }),
  join: (code: string) => send('POST', '/household/join', { code }),
  rename: (name: string) => send('PATCH', '/household', { name }),
  resetInvite: () => send('POST', '/household/invite/reset'),
  addMember: (email: string) => send('POST', '/household/members', { email }),
  removeMember: (userId: string) => send('DELETE', `/household/members/${userId}`),
  makeAdmin: (userId: string) => send('POST', `/household/members/${userId}/admin`),
  leave: () => apiRequest<void>({ method: 'POST', url: '/household/leave' }),
};
