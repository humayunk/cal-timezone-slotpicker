// TimezoneContextBar.tsx — pinned to the TOP of the slot column (not the far
// rail), so a slot is never spatially divorced from its timezone. Shows the
// booker zone (editable), the host zone (read-only), the relative ahead/behind
// phrase, and the 12/24h + collapse controls. All host-side chrome disappears
// when the offsets are equal.

import type { HourCycle } from "../lib/formatters";
import { cityOf } from "../lib/formatters";
import { ZoneCombobox } from "./ZoneCombobox";

export function TimezoneContextBar({
  bookerTz,
  hostTz,
  onBookerTz,
  bookerAbbrev,
  hostAbbrev,
  zonesDiffer,
  relativePhrase,
  hourCycle,
  onHourCycle,
  collapsed,
  onCollapsed,
}: {
  bookerTz: string;
  hostTz: string;
  onBookerTz: (tz: string) => void;
  bookerAbbrev: string;
  hostAbbrev: string;
  zonesDiffer: boolean;
  relativePhrase: string;
  hourCycle: HourCycle;
  onHourCycle: (h: HourCycle) => void;
  collapsed: boolean;
  onCollapsed: (c: boolean) => void;
}) {
  return (
    <div className="ctxbar">
      <div className="ctxbar-zones">
        <div className="zone you">
          <span className="zone-kind">Your time</span>
          <ZoneCombobox value={bookerTz} onChange={onBookerTz} label="Your timezone" />
          <span className="zone-abbrev">{bookerAbbrev}</span>
        </div>
        {zonesDiffer && (
          <div className="zone host">
            <span className="zone-kind">Host</span>
            <span className="zone-value">{cityOf(hostTz)}</span>
            <span className="zone-abbrev">{hostAbbrev}</span>
          </div>
        )}
      </div>

      {zonesDiffer && relativePhrase && (
        <div className="offset-phrase">{relativePhrase}</div>
      )}

      <div className="ctxbar-controls">
        <div
          className="seg"
          role="group"
          aria-label="Time format"
        >
          <button
            type="button"
            aria-pressed={hourCycle === "h12"}
            onClick={() => onHourCycle("h12")}
          >
            12h
          </button>
          <button
            type="button"
            aria-pressed={hourCycle === "h23"}
            onClick={() => onHourCycle("h23")}
          >
            24h
          </button>
        </div>
        {zonesDiffer && (
          <button
            type="button"
            className="linkbtn"
            aria-pressed={collapsed}
            onClick={() => onCollapsed(!collapsed)}
          >
            {collapsed ? "Show host time" : "Hide host time"}
          </button>
        )}
      </div>
    </div>
  );
}
