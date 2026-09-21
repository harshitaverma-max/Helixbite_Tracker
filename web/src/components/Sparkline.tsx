import { useMemo, useState } from "react";

interface SparklineProps {
  data: { value: number; recordedAt: string }[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 220, height = 56 }: SparklineProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 6;
    return data.map((d, i) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
      return { x, y, ...d };
    });
  }, [data, width, height]);

  if (points.length === 0) {
    return <div className="sparkline sparkline--empty">No data yet</div>;
  }

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const hovered = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="sparkline">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Instagram followers trend"
      >
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {hovered && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={0} y2={height} stroke="var(--baseline)" strokeWidth={1} />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
          </>
        )}
      </svg>
      {hovered && (
        <div className="sparkline__tooltip">
          <span className="sparkline__tooltip-value">{hovered.value.toLocaleString()}</span>
          <span className="sparkline__tooltip-time">{new Date(hovered.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}
    </div>
  );
}
