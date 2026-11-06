import React from 'react';
import Svg, { Rect, Circle, Line } from 'react-native-svg';

interface InstagramIconProps {
  size?: number;
  color?: string;
}

export function InstagramIcon({ size = 16, color = '#E1306C' }: InstagramIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <Circle cx="12" cy="12" r="4" />
      <Line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth={2.5} />
    </Svg>
  );
}
