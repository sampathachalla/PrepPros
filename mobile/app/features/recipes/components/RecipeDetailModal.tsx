import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { X, Clock, Bookmark, Calendar, Check, Users, ChefHat } from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import type { Recipe } from '../types/recipes';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
  onToggleBookmark: (recipeId: string) => void;
  onAddToCalendar: (recipe: Recipe) => void;
}

export function RecipeDetailModal({
  recipe,
  visible,
  onClose,
  onToggleBookmark,
  onAddToCalendar,
}: RecipeDetailModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  // Track checked ingredients locally for active cooking/prep session
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  if (!recipe) return null;

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isBookmarked = recipe.isBookmarked;

  const formatCategory = (cat: string) => {
    switch (cat) {
      case 'high_protein':
        return 'High Protein';
      case 'quick_prep':
        return 'Quick Prep';
      case 'breakfast':
        return 'Breakfast';
      case 'lunch_dinner':
        return 'Lunch / Dinner';
      case 'vegetarian':
        return 'Vegetarian';
      case 'snacks':
        return 'Snack';
      default:
        return 'Meal Prep';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Top Bar with Dismiss Handle & Actions */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: Brand.babyPink }]} />
            </View>

            <View style={[styles.headerRow, { borderBottomColor: palette.border }]}>
              {/* Category Badge */}
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: isDark ? '#262626' : '#F0F0F0' },
                ]}
              >
                <ChefHat size={14} color={Brand.babyBlue} style={{ marginRight: 5 }} />
                <Text style={[styles.categoryPillText, { color: palette.text }]}>
                  {formatCategory(recipe.category)}
                </Text>
              </View>

              {/* Action Buttons: Bookmark & Close */}
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => onToggleBookmark(recipe.id)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isBookmarked
                        ? isDark
                          ? 'rgba(245, 175, 196, 0.2)'
                          : 'rgba(245, 175, 196, 0.3)'
                        : isDark
                          ? '#262626'
                          : '#F5F5F5',
                    },
                  ]}
                  accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark recipe'}
                >
                  <Bookmark
                    size={17}
                    color={isBookmarked ? Brand.babyPink : palette.text}
                    fill={isBookmarked ? Brand.babyPink : 'transparent'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: isDark ? '#262626' : '#F5F5F5' },
                  ]}
                  accessibilityLabel="Close detail"
                >
                  <X size={17} color={palette.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Body */}
            <View style={styles.body}>
              {/* Title & Category */}
              <Text style={[styles.title, { color: palette.text }]}>
                {recipe.title}
              </Text>

              {/* Meta stats bar */}
              <View
                style={[
                  styles.statsRow,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={styles.statItem}>
                  <Clock size={16} color={Brand.babyPink} />
                  <Text style={[styles.statValue, { color: palette.text }]}>
                    {recipe.prepTimeMinutes}m
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Prep Time
                  </Text>
                </View>

                {recipe.cookTimeMinutes ? (
                  <View style={styles.statItem}>
                    <ChefHat size={16} color={Brand.babyBlue} />
                    <Text style={[styles.statValue, { color: palette.text }]}>
                      {recipe.cookTimeMinutes}m
                    </Text>
                    <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                      Cook Time
                    </Text>
                  </View>
                ) : null}

                <View style={styles.statItem}>
                  <Users size={16} color="#A78BFA" />
                  <Text style={[styles.statValue, { color: palette.text }]}>
                    {recipe.servings}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Servings
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: Brand.babyPink }]}>
                    {recipe.difficulty}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Difficulty
                  </Text>
                </View>
              </View>

              {/* Add to Calendar Button */}
              <TouchableOpacity
                onPress={() => onAddToCalendar(recipe)}
                activeOpacity={0.85}
                style={[styles.calendarButton, { backgroundColor: Brand.babyPink }]}
              >
                <Calendar size={18} color={Brand.black} style={{ marginRight: 8 }} />
                <Text style={styles.calendarButtonText}>Add to Meal Planner</Text>
              </TouchableOpacity>

              {/* Ingredients Checklist */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Ingredients
                  </Text>
                  <Text style={[styles.sectionCount, { color: palette.textMuted }]}>
                    {recipe.ingredients.length} items
                  </Text>
                </View>

                {recipe.ingredients.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.id];
                  return (
                    <Pressable
                      key={ing.id}
                      onPress={() => toggleIngredient(ing.id)}
                      style={[
                        styles.ingredientRow,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isChecked ? Brand.babyPink : palette.border,
                            backgroundColor: isChecked ? Brand.babyPink : 'transparent',
                          },
                        ]}
                      >
                        {isChecked && (
                          <Check size={14} color={Brand.black} strokeWidth={3} />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.ingredientText,
                          {
                            color: isChecked ? palette.textMuted : palette.text,
                            textDecorationLine: isChecked ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {ing.name}
                      </Text>

                      {ing.amount ? (
                        <Text style={[styles.ingredientAmount, { color: palette.textMuted }]}>
                          {ing.amount}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Step-by-Step Instructions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Instructions
                </Text>

                {recipe.steps.map((step) => (
                  <View
                    key={step.stepNumber}
                    style={[
                      styles.stepRow,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{step.stepNumber}</Text>
                    </View>
                    <Text style={[styles.stepInstruction, { color: palette.text }]}>
                      {step.instruction}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    marginTop: 44,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  handleContainer: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarButtonText: {
    color: Brand.black,
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientAmount: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.babyPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepBadgeText: {
    color: Brand.black,
    fontSize: 12,
    fontWeight: '800',
  },
  stepInstruction: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
