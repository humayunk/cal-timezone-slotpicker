// SlotList.tsx — role=listbox with roving tabindex. Visually grouped by period
// (Morning/Afternoon/Evening) and broken by a host-day divider wherever the
// host's calendar date rolls over; those headers/dividers are presentation-only
// so AT hears a flat set of options, each carrying one authoritative label.

import { useEffect } from "react";
import type { Period, Slot } from "../lib/formatters";
import { useRovingListbox } from "../lib/useRovingListbox";

export interface Deco {
  slot: Slot;
  primary: string;
  host: string | null;
  period: Period;
  delta: number; // host day vs booker day
  hostDateLabel: string;
  label: string; // authoritative accessible name
}

type Row =
  | { kind: "period"; label: string; count: number; key: string }
  | { kind: "divider"; label: string; key: string }
  | { kind: "slot"; i: number; key: string };

export function SlotList({
  decos,
  listLabel,
  selectedInstant,
  onSelect,
  focusSignal,
}: {
  decos: Deco[];
  listLabel: string;
  selectedInstant: string | null;
  onSelect: (instant: string) => void;
  /** Changes whenever the day/data changes, to move focus into the list. */
  focusSignal: string;
}) {
  const periodStarts: number[] = [];
  {
    let prev: Period | null = null;
    decos.forEach((d, i) => {
      if (d.period !== prev) {
        periodStarts.push(i);
        prev = d.period;
      }
    });
  }

  const { activeIndex, setActiveIndex, optionRef, onKeyDown } = useRovingListbox({
    count: decos.length,
    isEnabled: (i) => decos[i]?.slot.available ?? false,
    periodStarts,
    typeaheadKey: (i) => decos[i]?.primary.match(/\d+/)?.[0] ?? "",
    onActivate: (i) => onSelect(decos[i].slot.instant),
  });

  // On a day/data change, reposition the roving tab stop to the selected
  // instant (if still available) else the first available slot — so Tab lands
  // on a sensible option. Deliberately does NOT call focus(), to avoid stealing
  // focus on initial load / mouse-driven date changes.
  useEffect(() => {
    const target =
      decos.findIndex((d) => d.slot.instant === selectedInstant && d.slot.available) >= 0
        ? decos.findIndex((d) => d.slot.instant === selectedInstant)
        : decos.findIndex((d) => d.slot.available);
    if (target >= 0) setActiveIndex(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  // Build the visual row sequence.
  const rows: Row[] = [];
  let curPeriod: Period | null = null;
  let curDelta: number | null = null;
  decos.forEach((d, i) => {
    if (d.period !== curPeriod) {
      const count = decos.filter((x) => x.period === d.period).length;
      rows.push({ kind: "period", label: `${d.period} · ${count}`, count, key: `p-${d.period}` });
      curPeriod = d.period;
      curDelta = null; // reset so a divider can re-announce within a new period
    }
    if (d.host !== null && d.delta !== curDelta && d.delta !== 0) {
      rows.push({ kind: "divider", label: d.hostDateLabel, key: `d-${i}` });
      curDelta = d.delta;
    } else if (d.delta === 0) {
      curDelta = 0;
    }
    rows.push({ kind: "slot", i, key: d.slot.instant });
  });

  return (
    <ul
      className="slotlist enter"
      role="listbox"
      aria-label={listLabel}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {rows.map((row) => {
        if (row.kind === "period") {
          return (
            <li key={row.key} role="presentation" className="period-header">
              {row.label}
            </li>
          );
        }
        if (row.kind === "divider") {
          return (
            <li key={row.key} role="presentation" className="host-divider">
              {row.label}
            </li>
          );
        }
        const d = decos[row.i];
        const disabled = !d.slot.available;
        const selected = d.slot.instant === selectedInstant;
        return (
          <li
            key={row.key}
            ref={optionRef(row.i)}
            role="option"
            aria-selected={selected}
            aria-disabled={disabled || undefined}
            aria-label={d.label}
            tabIndex={row.i === activeIndex ? 0 : -1}
            className={`slot${d.host ? " dual" : ""}${d.delta !== 0 && d.host ? " nextday" : ""}`}
            onClick={() => !disabled && onSelect(d.slot.instant)}
            onFocus={() => !disabled && setActiveIndex(row.i)}
          >
            <span className="dot" aria-hidden="true" />
            <span className="slot-times">
              <span className="slot-primary" aria-hidden="true">
                {d.primary}
              </span>
              {d.host && (
                <span className="slot-host" aria-hidden="true">
                  {d.host}
                  {d.delta !== 0 && (
                    <span className="daychip">{d.delta > 0 ? "+1d" : "−1d"}</span>
                  )}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
