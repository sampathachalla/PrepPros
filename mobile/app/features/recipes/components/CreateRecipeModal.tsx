import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { RECIPE_CATEGORIES } from '../constants/recipes';
import type { CreateRecipeInput, RecipeCategory } from '../types/recipes';

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: CreateRecipeInput) => Promise<{ success: boolean; error?: string }>;
}

export function CreateRecipeModal({
  visible,
  onClose,
  onCreate,
}: CreateRecipeModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('lunch_dinner');
  const [prepTime, setPrepTime] = useState('20');
  const [servings, setServings] = useState('4');
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setCategory('lunch_dinner');
    setPrepTime('20');
    setServings('4');
    setIngredientsText('');
    setInstructionsText('');
    setImageUrl('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const prepMins = parseInt(prepTime, 10);
    const servingsCount = parseInt(servings, 10);

    if (isNaN(prepMins) || prepMins <= 0) {
      setErrorMessage('Please enter a valid prep time');
      return;
    }

    if (isNaN(servingsCount) || servingsCount <= 0) {
      setErrorMessage('Please enter valid servings');
      return;
    }

    const result = await onCreate({
      title,
      category,
      prepTimeMinutes: prepMins,
      servings: servingsCount,
      ingredientsText,
      instructionsText,
      imageUrl: imageUrl.trim() || undefined,
    });

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    } else {
      resetForm();
    }
  };

  const categoriesOptions = RECIPE_CATEGORIES.filter((c) => c.key !== 'all');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                New Meal Prep Recipe
              </Text>
              <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                Add your own custom creation
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: palette.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.text }]}>Recipe Title</Text>
              <TextInput
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. Teriyaki Chicken & Jasmine Rice"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />
            </View>

            {/* Category Chips */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categoriesOptions.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor:
                          category === cat.key ? Brand.babyPink : palette.surface,
                        borderColor:
                          category === cat.key ? Brand.babyPink : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        {
                          color: category === cat.key ? Brand.black : palette.textMuted,
                          fontWeight: category === cat.key ? '700' : '500',
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Prep Time & Servings Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: palette.text }]}>Prep Time (mins)</Text>
                <TextInput
                  value={prepTime}
                  onChangeText={setPrepTime}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: palette.text }]}>Servings</Text>
                <TextInput
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="numeric"
                  placeholder="4"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Ingredients (One per line) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.text }]}>
                Ingredients (One per line)
              </Text>
              <TextInput
                value={ingredientsText}
                onChangeText={setIngredientsText}
                placeholder={"2 chicken breasts\n1 cup brown rice\n1 cup broccoli florets"}
                placeholderTextColor={palette.textMuted}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />
            </View>

            {/* Instructions (One step per line) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.text }]}>
                Cooking Instructions (One step per line)
              </Text>
              <TextInput
                value={instructionsText}
                onChangeText={setInstructionsText}
                placeholder={"Cook rice in boiling water.\nSear seasoned chicken in a pan.\nDivide into containers."}
                placeholderTextColor={palette.textMuted}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />
            </View>

            {/* Optional Image URL */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.text }]}>
                Photo URL (Optional)
              </Text>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/food.jpg"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              style={[styles.saveBtn, { backgroundColor: Brand.babyPink }]}
            >
              <Text style={styles.saveBtnText}>Save Recipe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.cancelBtn}
            >
              <Text style={[styles.cancelBtnText, { color: palette.textMuted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF5350',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 12,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: Brand.black,
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
