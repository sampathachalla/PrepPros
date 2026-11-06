import { TextInput, type TextInputProps } from 'react-native';
import { AppTheme } from '../../../constants/Colors';

export function AuthTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={AppTheme.textMuted}
      {...props}
      style={[
        {
          borderBottomWidth: 1,
          borderColor: AppTheme.border,
          marginBottom: 20,
          paddingVertical: 10,
          fontSize: 14,
          color: AppTheme.text,
        },
        props.style,
      ]}
    />
  );
}
