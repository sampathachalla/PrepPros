import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { importTimerLabel } from '../utils/importTimer';
import type { BookmarkImportEstimate } from '../types/bookmarks';

interface ImportTimerProps {
  estimate?: BookmarkImportEstimate;
  style?: StyleProp<TextStyle>;
}

/** Counts down between polls. Give it `key={estimate?.elapsedSeconds}` so each poll's fresh time restarts it. */
export function ImportTimer({ estimate, style }: ImportTimerProps) {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTicks((count) => count + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text style={style}>
      {estimate ? importTimerLabel(estimate.averageSeconds, estimate.elapsedSeconds + ticks) : 'Reading recipe…'}
    </Text>
  );
}
