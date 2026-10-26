# Timezone-clear booking slot picker

A concept rebuild of the Cal.com booking time-slot picker that makes
cross-timezone booking unambiguous, built as an accessible, headless-composed
scheduling primitive in React + TypeScript.

> Not affiliated with Cal.com. An independent concept, built from the public
> product, as a design-engineering work sample.

## The problem

On the live booking page, every time slot is shown in the booker's single
selected timezone, and the timezone control sits in the far-left rail, spatially
divorced from the slots on the right. So a booker scheduling across timezones
has no host-side reference and is left doing mental math: "is 8am my time or
theirs?" For an async-first, globally distributed product whose tagline is
"Own Your Time," cross-timezone clarity is the core job, and the booking
surface punts on it.

## The approach

One absolute instant (ISO UTC) per slot drives every rendered and spoken time
through `Intl.DateTimeFormat`, formatted once for the booker's zone and once for
the host's. The two can never drift, and DST and half-hour/quarter-hour zones
are always correct because offsets come from the engine, never a stored
constant.

Three reinforcing layers make the dual-timezone truth impossible to misread,
and all three disappear together when the offsets are equal:

1. **A relocated, sticky timezone context bar** pinned to the top of the slot
   column (the core fix), naming your zone (editable) and the host's, with the
   computed relative phrase — "Berlin is 6 hours ahead" — because *ahead/behind*
   is the word that kills the mental math.
2. **Per-slot paired times**: each slot shows your local time (primary) with the
   host's local time beneath it (muted but AA-contrast, never an opacity hack).
3. **A host-day rollover band**: when a slot falls on the host's next calendar
   day, the list inserts a labeled divider ("Wed, Mar 4 · Berlin"), tints the
   slots below it, and marks each with a "+1d" chip — so "11 PM my time" is
   visibly the host's tomorrow, spatially, not as an abstract badge.

When the booker and host share an offset, the component hard-collapses to a
clean single-timezone list (no host line, no phrase, no toggle): a component
that renders a redundant duplicate line would be lying about the design.

## Accessibility

Built keyboard- and screen-reader-first, not QA'd for it afterward.

- The slot list is a **listbox with roving tabindex** — one tab stop. Arrows
  browse without committing (why a listbox beats a radiogroup for pick-then-
  confirm), Home/End jump to the ends, PageUp/PageDown page by period group,
  digit typeahead jumps by hour, Enter/Space select. Disabled slots are skipped.
- **The composed `aria-label` is the single source of truth.** Each option's
  accessible name carries both times, the date relationship, and the rollover as
  one unambiguous string ("8:00 AM Tuesday, March 3 your time, 2:00 PM host time
  in Berlin, same day"). The visual city prefix, "+1d" chip, divider, and
  availability dot are all `aria-hidden`, so there is no double-read.
- A single **polite live region** announces the result count and timezone
  changes; errors use `role="alert"`. Focus is moved into the list on data
  change and never dropped to `<body>`; focus (a colored ring) and selection (a
  filled background and emphasized border) are never conflated.
- The booker-zone picker is a proper ARIA **combobox** over
  `Intl.supportedValuesOf("timeZone")`.
- Primary time ≥ 7:1 and the muted host line ≥ 4.5:1 in **both** themes via
  dedicated tokens; 44px minimum hit targets; `prefers-reduced-motion` collapses
  all motion to instant.

## Run it

```sh
pnpm install
pnpm dev
```

Use the **Scenario** switch to see Toronto → Berlin (evening rollover),
Toronto → Kolkata (+5:30, proving half-hour offsets), and Toronto → Toronto
(the equal-offset collapse); the **State** switch to see loading and error; and
the theme switch for light/dark.

## Built with

React 19, TypeScript, Vite, and the platform `Intl` APIs
(`DateTimeFormat` with `formatToParts`, `supportedValuesOf`). No date or
component libraries — the scheduling and listbox primitives are hand-rolled, in
the spirit of a headless (Base UI / Radix) composition.

## Deliberately left as documented extensions

- **Virtualization** for 24h / 15-minute days. A naive virtualized listbox drops
  screen-reader focus when windowed nodes unmount, so it needs a focus-survival
  strategy; period grouping + paging gives the same traversal speed without that
  hazard, so virtualization is out of this default build on purpose.
- **Multi-host / team events** (an overlap cell with a per-slot participant
  popover), with the primary column staying "your time" at any headcount.
