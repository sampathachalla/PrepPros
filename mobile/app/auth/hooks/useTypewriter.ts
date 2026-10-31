import { useEffect, useState } from 'react';

export function useTypewriter(text: string, speed = 100): string {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index));
      index = index >= text.length ? 0 : index + 1;
    }, speed);
    return () => clearInterval(interval);
  }, [speed, text]);

  return displayedText;
}
