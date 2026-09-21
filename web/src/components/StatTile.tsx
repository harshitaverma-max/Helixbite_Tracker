interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  live?: boolean;
}

export function StatTile({ label, value, sublabel, live }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__label-row">
        <span className="stat-tile__label">{label}</span>
        {live !== undefined && (
          <span className={`live-dot ${live ? "live-dot--live" : "live-dot--demo"}`} title={live ? "Live data" : "Demo data"} />
        )}
      </div>
      <div className="stat-tile__value">{value}</div>
      {sublabel && <div className="stat-tile__sublabel">{sublabel}</div>}
    </div>
  );
}
