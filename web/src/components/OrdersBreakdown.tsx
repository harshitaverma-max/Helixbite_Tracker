import type { Summary } from "../api.js";

const CHANNELS: { key: "amazon" | "website" | "whatsapp"; label: string; colorVar: string }[] = [
  { key: "amazon", label: "Amazon", colorVar: "--series-1" },
  { key: "website", label: "Website", colorVar: "--series-2" },
  { key: "whatsapp", label: "WhatsApp", colorVar: "--series-3" },
];

export function OrdersBreakdown({ today }: { today: Summary["orders"]["today"] }) {
  const max = Math.max(today.amazon, today.website, today.whatsapp, 1);

  return (
    <div className="breakdown">
      <div className="breakdown__legend">
        {CHANNELS.map((c) => (
          <span key={c.key} className="breakdown__legend-item">
            <span className="breakdown__swatch" style={{ background: `var(${c.colorVar})` }} />
            {c.label}
          </span>
        ))}
      </div>
      <div className="breakdown__bars">
        {CHANNELS.map((c) => {
          const value = today[c.key];
          return (
            <div className="breakdown__row" key={c.key}>
              <span className="breakdown__row-label">{c.label}</span>
              <div className="breakdown__track">
                <div
                  className="breakdown__fill"
                  style={{ width: `${(value / max) * 100}%`, background: `var(${c.colorVar})` }}
                />
              </div>
              <span className="breakdown__row-value">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
