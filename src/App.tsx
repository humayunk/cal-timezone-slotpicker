import { useEffect, useState } from "react";
import { SlotPicker, type DemoState } from "./components/SlotPicker";
import { DEMO_DAYS, ZONE_FIXTURES } from "./lib/mockSlots";
import "./styles.css";
import "./app.css";

type Theme = "system" | "light" | "dark";

export default function App() {
  const [theme, setTheme] = useState<Theme>("system");
  const [fixtureKey, setFixtureKey] = useState(ZONE_FIXTURES[0].key);
  const [dayISO, setDayISO] = useState(DEMO_DAYS[1].iso);
  const [demoState, setDemoState] = useState<DemoState>("live");

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme);
  }, [theme]);

  const fixture = ZONE_FIXTURES.find((f) => f.key === fixtureKey)!;

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          Timezone-clear booking · <span className="muted">a booking primitive for Cal.com</span>
        </div>
        <div className="seg" role="group" aria-label="Theme">
          {(["system", "light", "dark"] as Theme[]).map((t) => (
            <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <p className="lede">
        On the live booking page, every slot shows one timezone and the zone label sits off in the
        far rail — so a cross-timezone booker is left doing mental math. This primitive pins both
        zones to the slots, shows each slot in <strong>your time and the host's</strong>, and bands
        the slots that fall on the host's next day. It collapses to a clean single-timezone list
        when the offsets match.
      </p>

      <div className="controls">
        <div className="control">
          <span className="control-label">Scenario</span>
          <div className="seg" role="group" aria-label="Timezone scenario">
            {ZONE_FIXTURES.map((f) => (
              <button
                key={f.key}
                aria-pressed={fixtureKey === f.key}
                onClick={() => setFixtureKey(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="control-note">{fixture.note}</span>
        </div>
        <div className="control">
          <span className="control-label">State</span>
          <div className="seg" role="group" aria-label="Demo state">
            {(["live", "loading", "error"] as DemoState[]).map((s) => (
              <button key={s} aria-pressed={demoState === s} onClick={() => setDemoState(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="booking">
        <aside className="rail">
          <div className="rail-avatar" aria-hidden="true" />
          <div className="rail-host">Alex Rivera</div>
          <div className="rail-title">15 Minute Meeting</div>
          <ul className="rail-meta">
            <li>15 min</li>
            <li>Cal Video</li>
            <li>Host in {fixture.hostTz.split("/").pop()?.replace(/_/g, " ")}</li>
          </ul>
        </aside>

        <main className="booking-main">
          <div className="datestrip" role="group" aria-label="Choose a day">
            {DEMO_DAYS.map((d) => (
              <button
                key={d.iso}
                className="dateday"
                aria-pressed={dayISO === d.iso}
                onClick={() => setDayISO(d.iso)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <SlotPicker
            key={fixtureKey}
            bookerTz={fixture.bookerTz}
            hostTz={fixture.hostTz}
            dayISO={dayISO}
            demoState={demoState}
            onChangeDay={setDayISO}
            onRetry={() => setDemoState("live")}
          />
        </main>
      </div>

      <footer className="foot">
        Built with React + TypeScript and the real <code>Intl.DateTimeFormat</code> engine. Keyboard:
        ↑/↓ browse, PgUp/PgDn by period, Home/End, type a digit to jump, Enter to select.
      </footer>
    </div>
  );
}
