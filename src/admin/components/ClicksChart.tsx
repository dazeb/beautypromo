const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function ClicksChart({ daily }: { daily: { day: string; clicks: number }[] }) {
  const max = Math.max(1, ...daily.map((d) => d.clicks));
  const ticks = [max, Math.round(max / 2), 0];
  return (
    <div className="adm-chart">
      <div className="adm-chart__axis" aria-hidden="true">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <ol className="adm-chart__bars" aria-label="Clicks per day, last 30 days">
        {daily.map((d, i) => {
          const label = dayLabel.format(new Date(`${d.day}T12:00:00Z`));
          return (
            <li key={d.day} className="adm-chart__bar" title={`${label}: ${d.clicks} clicks`}>
              <span className="adm-chart__fill" style={{ height: `${(d.clicks / max) * 100}%` }} />
              <span className="visually-hidden">
                {label}: {d.clicks} clicks
              </span>
              {(daily.length - 1 - i) % 7 === 0 ? (
                <span className="adm-chart__label" aria-hidden="true">
                  {label}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
