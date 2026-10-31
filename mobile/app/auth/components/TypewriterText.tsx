import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTypewriter } from '../hooks/useTypewriter';

type TypewriterTextProps = {
  text: string;
  speed?: number;
  style?: StyleProp<TextStyle>;
};

export function TypewriterText({ text, speed, style }: TypewriterTextProps) {
  return <Text style={style}>{useTypewriter(text, speed)}</Text>;
}
