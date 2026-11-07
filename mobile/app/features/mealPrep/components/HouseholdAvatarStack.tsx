import React from 'react';
import { ContributorAvatarStack } from '../../calendar/components/ContributorAvatarStack';
import type { HouseholdMember } from '../types/mealPlanner.types';

export interface HouseholdAvatarStackProps {
  members: HouseholdMember[];
  size?: number;
  overlap?: number;
  maxVisible?: number;
}

/**
 * Reuses the shared ContributorAvatarStack primitive with compact defaults for
 * Dish Library cards, 7x4 WeeklySlotGrid cells, and MealProposalCard bundles.
 */
export function HouseholdAvatarStack({
  members,
  size = 20,
  overlap = 6,
  maxVisible = 3,
}: HouseholdAvatarStackProps) {
  return (
    <ContributorAvatarStack
      members={members}
      size={size}
      overlap={overlap}
      maxVisible={maxVisible}
    />
  );
}
