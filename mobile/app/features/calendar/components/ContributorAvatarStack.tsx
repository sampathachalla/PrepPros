import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { HouseholdMember } from '../types/calendar';

interface ContributorAvatarStackProps {
  members: HouseholdMember[];
  /** Diameter of each avatar circle */
  size?: number;
  /** How far each avatar overlaps the previous (px) */
  overlap?: number;
  maxVisible?: number;
}

/**
 * Overlapping household avatars (initials or photo) for compact meal chips.
 */
export function ContributorAvatarStack({
  members,
  size = 16,
  overlap = 5,
  maxVisible = 4,
}: ContributorAvatarStackProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, maxVisible);
  const overflow = members.length - visible.length;
  const stackWidth = size + (visible.length - 1) * (size - overlap) + (overflow > 0 ? size - overlap : 0);

  return (
    <View style={[styles.stack, { width: stackWidth, height: size }]}>
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: member.color,
              left: index * (size - overlap),
              zIndex: index + 1,
            },
          ]}
        >
          {member.avatarUrl ? (
            <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.initials, { fontSize: size * 0.42 }]}>{member.initials}</Text>
          )}
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.avatar,
            styles.overflowBadge,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              left: visible.length * (size - overlap),
              zIndex: visible.length + 1,
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: size * 0.38 }]}>+{overflow}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(10, 10, 10, 0.12)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '800',
    color: '#0A0A0A',
  },
  overflowBadge: {
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
  },
  overflowText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
