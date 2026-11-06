import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useHouseholdColors } from '../hooks/useHouseholdColors';
import type { HouseholdPerson } from '../types/household';

interface HouseholdMemberRowProps {
  member: HouseholdPerson;
  isYou: boolean;
  /** Left out when this person can't change this member. */
  onEdit?: (member: HouseholdPerson) => void;
}

export function HouseholdMemberRow({ member, isYou, onEdit }: HouseholdMemberRowProps) {
  const colors = useHouseholdColors();

  return (
    <View style={[styles.row, { borderBottomColor: colors.gridLine }]}>
      <View style={[styles.avatar, { backgroundColor: member.color }]}>
        <Text style={styles.initials}>{member.initials}</Text>
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {member.name}
          {isYou ? ' (you)' : ''}
        </Text>
        <View style={styles.roleRow}>
          {member.role === 'admin' ? <Crown size={11} color={colors.primary} /> : null}
          <Text style={[styles.role, { color: colors.textMuted }]}>
            {member.role === 'admin' ? 'Admin' : 'Member'}
          </Text>
        </View>
      </View>
      {onEdit ? (
        <TouchableOpacity
          onPress={() => onEdit(member)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`Edit ${member.name}`}
          accessibilityRole="button"
          style={[styles.editButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.editText, { color: colors.text }]}>Edit</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 14, fontWeight: '800', color: '#111111' },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  role: { fontSize: 12 },
  editButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontSize: 12, fontWeight: '700' },
});
