import { TextInput, type TextInputProps } from 'react-native';

export function AuthTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#7A7A7A"
      {...props}
      style={[
        {
          borderBottomWidth: 1,
          borderColor: '#DADADA',
          marginBottom: 20,
          paddingVertical: 10,
          fontSize: 14,
          color: '#1A1A1A',
        },
        props.style,
      ]}
    />
  );
}
