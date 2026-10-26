// ZoneCombobox.tsx — an editable, type-to-filter ARIA combobox over the full
// IANA zone list (Intl.supportedValuesOf). List-autocomplete pattern:
// role=combobox input + role=listbox popover, aria-activedescendant, full
// keyboard (Arrow/Enter/Escape). Degrades to a plain input if the browser
// lacks supportedValuesOf.

import { useId, useMemo, useRef, useState } from "react";
import { cityOf } from "../lib/formatters";

const ALL_ZONES: string[] =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["America/Toronto", "Europe/Berlin", "Asia/Kolkata", "America/Los_Angeles", "UTC"];

export function ZoneCombobox({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (tz: string) => void;
  label: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? ALL_ZONES.filter((z) => z.toLowerCase().includes(q))
      : ALL_ZONES.filter((z) => z === value).concat(
          ALL_ZONES.filter((z) => z !== value),
        );
    return pool.slice(0, 8);
  }, [query, value]);

  const commit = (tz: string) => {
    onChange(tz);
    setQuery("");
    setOpen(false);
    setActive(0);
    // Keep focus on the (still-mounted) input, which now shows the chosen city —
    // never blur to <body>.
  };

  const listOpen = open && results.length > 0;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        commit(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const activeId = open && results[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <div className="combo">
      <input
        ref={inputRef}
        className="zone-value combo-input"
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        aria-label={label}
        value={open ? query : `${cityOf(value)}`}
        placeholder={cityOf(value)}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {listOpen && (
        <ul className="combo-list" role="listbox" id={listId} aria-label={label}>
          {results.map((z, i) => (
            <li
              key={z}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={z === value}
              className={`combo-opt${i === active ? " active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(z);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="combo-city">{cityOf(z)}</span>
              <span className="combo-region">{z}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
