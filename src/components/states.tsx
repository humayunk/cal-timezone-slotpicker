// states.tsx — the four designed non-happy states. Each is a moment, not a bare
// string. The context bar stays mounted around these so timezone context never
// collapses on load/empty/error.

export function SkeletonList() {
  return (
    <div className="slotlist" aria-busy="true">
      <span className="visually-hidden">Loading available times</span>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="skeleton-row" aria-hidden="true" />
      ))}
    </div>
  );
}

export function EmptyState({
  dateLabel,
  bookerCity,
  nextLabel,
  onNext,
}: {
  dateLabel: string;
  bookerCity: string;
  nextLabel?: string;
  onNext?: () => void;
}) {
  return (
    <div className="state empty">
      <div className="state-title">No times on {dateLabel}</div>
      <div className="state-body">
        The host has no openings this day in your timezone ({bookerCity}).
      </div>
      {nextLabel && onNext && (
        <button className="confirm" onClick={onNext}>
          Next available: {nextLabel} →
        </button>
      )}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="state error" role="alert">
      <div className="state-title">Couldn't load times</div>
      <div className="state-body">Check your connection and try again.</div>
      <button className="confirm" onClick={onRetry} autoFocus>
        Try again
      </button>
    </div>
  );
}
