import { getAuthUser, saveAuthUser } from '@/app/auth/store/authSession';
import { apiRequest } from '@/app/shared/services/apiClient';
import { STAT_LABELS } from '../constants/profile';
import type { ProfileStat, ProfileStatKey } from '../types/profile';

interface ProfileResponse {
  displayName: string | null;
  avatarColor: string | null;
  stats: Record<ProfileStatKey, number>;
}

export const toProfileStats = (stats: Record<ProfileStatKey, number>): ProfileStat[] =>
  (['mealsPlanned', 'recipesSaved', 'bookmarks'] as const).map((key) => ({
    key,
    label: STAT_LABELS[key],
    value: stats[key],
  }));

/** Profile Service layer: talks to api/src/modules/profile. */
export const profileService = {
  get: () => apiRequest<ProfileResponse>({ method: 'GET', url: '/profile' }),

  /** Saves the name and avatar, and keeps the copy held on this device in step. */
  async update(changes: { displayName?: string; avatarColor?: string }) {
    const profile = await apiRequest<ProfileResponse>({ method: 'PATCH', url: '/profile', data: changes });
    const user = await getAuthUser();
    if (user) {
      await saveAuthUser({ ...user, displayName: profile.displayName, avatarColor: profile.avatarColor });
    }
    return profile;
  },
};
