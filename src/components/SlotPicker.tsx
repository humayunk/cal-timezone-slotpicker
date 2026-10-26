// SlotPicker.tsx — owns all state and wires the primitive together. One UTC
// instant per slot drives every rendered + spoken time through Intl formatters,
// so the two zones can never drift.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildFormatter,
  cityOf,
  composeLabel,
  dayDelta,
  formatTime,
  longDate,
  offsetMinutes,
  periodOf,
  relativeInfo,
  shortDate,
  zoneAbbrev,
  type HourCycle,
  type Slot,
} from "../lib/formatters";
import {
  DEMO_DAYS,
  EMPTY_DAYS,
  NEXT_AVAILABLE_AFTER,
  generateSlots,
} from "../lib/mockSlots";
import { usePersistentState } from "../lib/usePersistentState";
import { SlotList, type Deco } from "./SlotList";
import { TimezoneContextBar } from "./TimezoneContextBar";
import { EmptyState, ErrorState, SkeletonList } from "./states";

type Status = "loading" | "ready" | "empty" | "error";
export type DemoState = "live" | "loading" | "error";

export function SlotPicker({
  bookerTz: initialBookerTz,
  hostTz,
  dayISO,
  demoState = "live",
  onChangeDay,
  onRetry,
}: {
  bookerTz: string;
  hostTz: string;
  dayISO: string;
  demoState?: DemoState;
  onChangeDay: (iso: string) => void;
  onRetry?: () => void;
}) {
  const [bookerTz, setBookerTz] = useState(initialBookerTz);
  const [hourCycle, setHourCycle] = usePersistentState<HourCycle>("slotpicker.hourCycle", "h12");
  const [collapsed, setCollapsed] = usePersistentState<boolean>("slotpicker.collapsed", false);
  const [selectedInstant, setSelectedInstant] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [liveMsg, setLiveMsg] = useState("");

  // Representative instant for day-level text. Anchored to booker-local midday
  // on dayISO (NOT noon UTC), so the date heading and screen-reader
  // announcements match the booker-local day shown in the list, even for
  // far-east zones (e.g. Pacific/Auckland, where noon UTC is already tomorrow).
  const repInstant = useMemo(() => {
    const utcNoon = `${dayISO}T12:00:00.000Z`;
    const off = offsetMinutes(utcNoon, bookerTz);
    return new Date(Date.parse(utcNoon) - off * 60000).toISOString();
  }, [dayISO, bookerTz]);
  const rel = relativeInfo(repInstant, bookerTz, hostTz);
  const zonesDiffer = rel.zonesDiffer;
  const effectiveDual = zonesDiffer && !collapsed;

  const bookerFmt = useMemo(() => buildFormatter(bookerTz, hourCycle), [bookerTz, hourCycle]);
  const hostFmt = useMemo(() => buildFormatter(hostTz, hourCycle), [hostTz, hourCycle]);

  // Load (simulated) whenever the day, zones, or demo state change.
  useEffect(() => {
    setSelectedInstant(null);
    setConfirmed(null);
    if (demoState === "error") {
      setStatus("error");
      return;
    }
    if (demoState === "loading") {
      setStatus("loading");
      return;
    }
    setStatus("loading");
    setLiveMsg("Loading available times.");
    const id = setTimeout(() => {
      const next = EMPTY_DAYS.has(dayISO)
        ? []
        : generateSlots(dayISO, { bookerTz, hostTz });
      setSlots(next);
      if (next.length === 0) {
        setStatus("empty");
        setLiveMsg(`No times available on ${longDate(repInstant, bookerTz)}.`);
      } else {
        setStatus("ready");
        const avail = next.filter((s) => s.available).length;
        setLiveMsg(
          `${avail} times available. Your time ${cityOf(bookerTz)}.` +
            (zonesDiffer ? ` ${rel.phrase}.` : ""),
        );
      }
    }, 420);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayISO, bookerTz, hostTz, demoState]);

  const decos: Deco[] = useMemo(
    () =>
      slots.map((slot) => {
        const delta = zonesDiffer ? dayDelta(slot.instant, bookerTz, hostTz) : 0;
        return {
          slot,
          primary: formatTime(slot.instant, bookerFmt),
          host: effectiveDual ? `${formatTime(slot.instant, hostFmt)} ${cityOf(hostTz)}` : null,
          period: periodOf(slot.instant, bookerTz),
          delta,
          hostDateLabel: `${shortDate(slot.instant, hostTz)} · ${cityOf(hostTz)}`,
          label: composeLabel(slot, { bookerTz, hostTz, bookerFmt, hostFmt, effectiveDual }),
        };
      }),
    [slots, bookerTz, hostTz, bookerFmt, hostFmt, effectiveDual, zonesDiffer],
  );

  const liveRef = useRef<HTMLDivElement>(null);

  const listLabel = `Available times for ${longDate(repInstant, bookerTz)}, your time ${cityOf(bookerTz)}`;

  const nextISO = NEXT_AVAILABLE_AFTER[dayISO];
  const nextLabel = nextISO ? DEMO_DAYS.find((d) => d.iso === nextISO)?.label : undefined;

  const confirmPrimary = confirmed ?? selectedInstant;

  return (
    <div className="picker" role="region" aria-label="Available times">
      <TimezoneContextBar
        bookerTz={bookerTz}
        hostTz={hostTz}
        onBookerTz={setBookerTz}
        bookerAbbrev={zoneAbbrev(repInstant, bookerTz)}
        hostAbbrev={zoneAbbrev(repInstant, hostTz)}
        zonesDiffer={zonesDiffer}
        relativePhrase={rel.phrase}
        hourCycle={hourCycle}
        onHourCycle={setHourCycle}
        collapsed={collapsed}
        onCollapsed={setCollapsed}
      />

      <div className="date-heading">{longDate(repInstant, bookerTz)}</div>

      {status === "loading" && <SkeletonList />}
      {status === "error" && (
        <ErrorState onRetry={() => (onRetry ? onRetry() : onChangeDay(dayISO))} />
      )}
      {status === "empty" && (
        <EmptyState
          dateLabel={longDate(repInstant, bookerTz)}
          bookerCity={cityOf(bookerTz)}
          nextLabel={nextLabel}
          onNext={nextISO ? () => onChangeDay(nextISO) : undefined}
        />
      )}
      {status === "ready" && (
        <SlotList
          decos={decos}
          listLabel={listLabel}
          selectedInstant={selectedInstant}
          onSelect={(instant) => {
            setSelectedInstant(instant);
            setConfirmed(null);
          }}
          focusSignal={`${dayISO}|${bookerTz}`}
        />
      )}

      {confirmPrimary && status === "ready" && (
        <div className="confirmbar">
          {confirmed ? (
            <div className="confirmed-note" aria-live="polite">
              ✓ Requested {formatTime(confirmed, bookerFmt)} ·{" "}
              {longDate(confirmed, bookerTz)}
              <div className="confirmed-sub">(Cal.com's booking form would open here)</div>
            </div>
          ) : (
            <button
              className="confirm"
              onClick={() => setConfirmed(selectedInstant)}
            >
              Confirm {formatTime(selectedInstant!, bookerFmt)}
            </button>
          )}
        </div>
      )}

      <div ref={liveRef} className="visually-hidden" aria-live="polite">
        {liveMsg}
      </div>
    </div>
  );
}
