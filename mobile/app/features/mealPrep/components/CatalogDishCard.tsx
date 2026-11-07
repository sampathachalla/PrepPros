import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Check, Clock3, Sparkles, Utensils } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { CatalogDish, HouseholdMember } from '../types/mealPlanner.types';
import { HouseholdAvatarStack } from './HouseholdAvatarStack';

export interface CatalogDishCardProps {
  dish: CatalogDish;
  members: HouseholdMember[];
  onPress: (dish: CatalogDish) => void;
  /** Used in Admin Daily Review dish editor when a dish is already in the slot draft */
  isSelected?: boolean;
  /** Used in Admin Daily Review dish editor when household members requested this dish for the slot */
  isRequestedByHousehold?: boolean;
  /** Number of slots the current user has already assigned this dish to in the current week */
  assignedSlotCount?: number;
}

export function CatalogDishCard({
  dish,
  members,
  onPress,
  isSelected = false,
  isRequestedByHousehold = false,
  assignedSlotCount = 0,
}: CatalogDishCardProps) {
  const colors = useCalendarColors();

  const interestedMembers = members.filter((m) => dish.interestedMemberIds.includes(m.id));
  const interestCount = Math.max(interestedMembers.length, dish.interestedMemberIds.length);
  const interestLabel =
    interestCount > 0
      ? `${interestCount} ${interestCount === 1 ? 'member' : 'members'} interested`
      : dish.reason ?? 'Tap to choose slots';

  const handlePress = () => {
    haptics.selection();
    onPress(dish);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={[
        dish.name,
        interestLabel,
        assignedSlotCount > 0 ? `Added to ${assignedSlotCount} slots` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected || assignedSlotCount > 0 ? colors.primary : colors.border,
        },
        (isSelected || assignedSlotCount > 0) && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.inputBackground }]}>
        {dish.imageUrl ? (
          <Image
            source={{ uri: dish.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={styles.placeholder}>
            <Utensils size={26} color={colors.secondary} />
          </View>
        )}

        {dish.minutes ? (
          <View style={[styles.timePill, { backgroundColor: 'rgba(10, 10, 10, 0.72)' }]}>
            <Clock3 size={11} color="#FFFFFF" />
            <Text style={styles.timeText}>{dish.minutes}m</Text>
          </View>
        ) : null}

        {isRequestedByHousehold ? (
          <View style={[styles.requestedBadge, { backgroundColor: colors.secondary }]}>
            <Sparkles size={10} color={colors.onPrimary} />
            <Text style={[styles.requestedText, { color: colors.onPrimary }]}>Requested</Text>
          </View>
        ) : null}

        {isSelected || assignedSlotCount > 0 ? (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Check size={12} color={colors.onPrimary} strokeWidth={3} />
            {assignedSlotCount > 0 && !isSelected ? (
              <Text style={[styles.selectedCountText, { color: colors.onPrimary }]}>
                {assignedSlotCount}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {dish.name}
        </Text>

        <View style={styles.footer}>
          {interestedMembers.length > 0 ? (
            <HouseholdAvatarStack members={interestedMembers} size={18} overlap={5} maxVisible={3} />
          ) : null}
          <Text
            style={[
              styles.interestText,
              { color: interestCount > 0 ? colors.text : colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {interestLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 196,
  },
  cardSelected: {
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.28,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  requestedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  requestedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    padding: 10,
    gap: 6,
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  interestText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
});
