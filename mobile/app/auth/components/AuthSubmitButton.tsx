import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { authStyles } from '../../../constants/theme';

interface AuthSubmitButtonProps {
  label: string;
  loadingLabel: string;
  isLoading: boolean;
  onPress: () => void;
}

/** The main button of a login or signup form; shows progress and ignores taps while it waits. */
export function AuthSubmitButton({ label, loadingLabel, isLoading, onPress }: AuthSubmitButtonProps) {
  return (
    <TouchableOpacity
      style={{
        ...authStyles.button,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        opacity: isLoading ? 0.7 : 1,
      }}
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityState={{ disabled: isLoading, busy: isLoading }}
    >
      {isLoading && <ActivityIndicator size="small" color={authStyles.buttonText.color} />}
      <Text
        style={{
          ...authStyles.buttonText,
          textAlign: 'center',
          fontWeight: '700',
          fontSize: 16,
        }}
      >
        {isLoading ? loadingLabel : label}
      </Text>
    </TouchableOpacity>
  );
}
