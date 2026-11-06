import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** What the shared header shows for the page that is on screen. */
export interface ScreenHeaderConfig {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showMascot?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

interface HeaderEntry {
  id: symbol;
  config: ScreenHeaderConfig;
}

interface HeaderApi {
  upsert: (id: symbol, config: ScreenHeaderConfig) => void;
  remove: (id: symbol) => void;
}

const HeaderApiContext = createContext<HeaderApi | null>(null);
const HeaderSnapshotContext = createContext<ScreenHeaderConfig | null>(null);

function sameConfig(a: ScreenHeaderConfig, b: ScreenHeaderConfig) {
  return (
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.showLogo === b.showLogo &&
    a.showMascot === b.showMascot &&
    a.showBack === b.showBack &&
    a.onBack === b.onBack &&
    a.rightAction === b.rightAction
  );
}

export function HeaderConfigProvider({ children }: { children: React.ReactNode }) {
  const entries = useRef<HeaderEntry[]>([]);
  const [snapshot, setSnapshot] = useState<ScreenHeaderConfig | null>(null);

  const api = useMemo<HeaderApi>(
    () => ({
      upsert(id, config) {
        const list = entries.current;
        const index = list.findIndex((entry) => entry.id === id);
        const isTop = index === list.length - 1;
        if (index !== -1 && isTop && sameConfig(list[index].config, config)) return;
        if (index === -1) list.push({ id, config });
        else list[index] = { id, config };
        const top = list[list.length - 1]?.config ?? null;
        setSnapshot((prev) => (prev && top && sameConfig(prev, top) ? prev : top));
      },
      remove(id) {
        const next = entries.current.filter((entry) => entry.id !== id);
        if (next.length === entries.current.length) return;
        entries.current = next;
        const top = next[next.length - 1]?.config ?? null;
        setSnapshot((prev) => {
          if (prev === top) return prev;
          if (prev && top && sameConfig(prev, top)) return prev;
          return top;
        });
      },
    }),
    [],
  );

  return (
    <HeaderApiContext.Provider value={api}>
      <HeaderSnapshotContext.Provider value={snapshot}>{children}</HeaderSnapshotContext.Provider>
    </HeaderApiContext.Provider>
  );
}

export function useHeaderSnapshot() {
  return useContext(HeaderSnapshotContext);
}

/**
 * Tell the shared header what this page should show.
 * Nested pages override the page under them, and only the focused page wins.
 */
export function useScreenHeader(config: ScreenHeaderConfig) {
  const api = useContext(HeaderApiContext);
  const id = useRef(Symbol('screen-header'));
  const { title, subtitle, showLogo, showMascot, showBack, onBack, rightAction } = config;

  useFocusEffect(
    useCallback(() => {
      if (!api) return undefined;
      const entryId = id.current;
      api.upsert(entryId, { title, subtitle, showLogo, showMascot, showBack, onBack, rightAction });
      return () => api.remove(entryId);
    }, [
      api,
      title,
      subtitle,
      showLogo,
      showMascot,
      showBack,
      onBack,
      rightAction,
    ]),
  );
}
