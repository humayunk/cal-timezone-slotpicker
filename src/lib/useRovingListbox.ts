// useRovingListbox.ts — roving-tabindex keyboard model for the slot listbox.
// The whole list is ONE tab stop. Arrows move focus WITHOUT selecting (browse
// before commit — why a listbox beats a radiogroup here). Home/End jump to the
// ends, PageUp/PageDown page by period group, digit typeahead jumps by hour,
// Enter/Space select. Disabled (unavailable) options are skipped.

import { useCallback, useRef, useState } from "react";

interface Options {
  count: number;
  isEnabled: (i: number) => boolean;
  /** Ascending indices at which a new period group (Morning/Afternoon/Evening) starts. */
  periodStarts: number[];
  /** Typeahead key per option, e.g. the leading hour digits of the time. */
  typeaheadKey: (i: number) => string;
  onActivate: (i: number) => void;
}

export function useRovingListbox({
  count,
  isEnabled,
  periodStarts,
  typeaheadKey,
  onActivate,
}: Options) {
  const firstEnabled = () => {
    for (let i = 0; i < count; i++) if (isEnabled(i)) return i;
    return -1;
  };
  const [activeIndex, setActiveIndex] = useState<number>(firstEnabled);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const typeahead = useRef<{ buffer: string; at: number }>({ buffer: "", at: 0 });

  const optionRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      refs.current[i] = el;
    },
    [],
  );

  const focusIndex = useCallback((i: number) => {
    if (i < 0) return;
    setActiveIndex(i);
    refs.current[i]?.focus();
  }, []);

  const step = useCallback(
    (from: number, dir: 1 | -1) => {
      let i = from;
      for (let n = 0; n < count; n++) {
        i += dir;
        if (i < 0 || i >= count) return from; // clamp at the ends
        if (isEnabled(i)) return i;
      }
      return from;
    },
    [count, isEnabled],
  );

  const edge = useCallback(
    (dir: 1 | -1) => {
      const start = dir === 1 ? 0 : count - 1;
      for (let n = 0; n < count; n++) {
        const i = start + dir * n;
        if (isEnabled(i)) return i;
      }
      return activeIndex;
    },
    [count, isEnabled, activeIndex],
  );

  const page = useCallback(
    (from: number, dir: 1 | -1) => {
      if (periodStarts.length === 0) return from;
      // Current period = last start <= from.
      let cur = 0;
      for (let k = 0; k < periodStarts.length; k++) if (periodStarts[k] <= from) cur = k;
      const target = Math.min(Math.max(cur + dir, 0), periodStarts.length - 1);
      // First enabled at/after that period's start.
      for (let i = periodStarts[target]; i < count; i++) if (isEnabled(i)) return i;
      return from;
    },
    [count, isEnabled, periodStarts],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusIndex(step(activeIndex, 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          focusIndex(step(activeIndex, -1));
          break;
        case "Home":
          e.preventDefault();
          focusIndex(edge(1));
          break;
        case "End":
          e.preventDefault();
          focusIndex(edge(-1));
          break;
        case "PageDown":
          e.preventDefault();
          focusIndex(page(activeIndex, 1));
          break;
        case "PageUp":
          e.preventDefault();
          focusIndex(page(activeIndex, -1));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (isEnabled(activeIndex)) onActivate(activeIndex);
          break;
        default:
          if (/^\d$/.test(e.key)) {
            const now = Date.now();
            const t = typeahead.current;
            t.buffer = now - t.at > 800 ? e.key : t.buffer + e.key;
            t.at = now;
            for (let i = 0; i < count; i++) {
              if (isEnabled(i) && typeaheadKey(i).startsWith(t.buffer)) {
                focusIndex(i);
                break;
              }
            }
          }
      }
    },
    [activeIndex, count, edge, focusIndex, isEnabled, onActivate, page, step, typeaheadKey],
  );

  return { activeIndex, setActiveIndex, optionRef, focusIndex, onKeyDown };
}
