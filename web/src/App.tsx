import { useEffect, useState } from "react";
import { fetchSummary, subscribeToLiveUpdates, type Summary } from "./api.js";
import { OrdersBreakdown } from "./components/OrdersBreakdown.js";
import { OrdersFeed } from "./components/OrdersFeed.js";
import { Sparkline } from "./components/Sparkline.js";
import { StatTile } from "./components/StatTile.js";

const POLL_INTERVAL_MS = 15_000;

export function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchSummary();
        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Can't reach the tracker API. Is the server running?");
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    const unsubscribe = subscribeToLiveUpdates(load);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <div className="viz-root page">
      <header className="page__header">
        <h1>Helixbite Live Tracker</h1>
        {summary && <span className="page__updated">Updated {new Date(summary.generatedAt).toLocaleTimeString()}</span>}
      </header>

      {error && <div className="banner banner--error">{error}</div>}

      {summary && (
        <>
          <section className="tile-grid">
            <StatTile label="Events participated" value={summary.events.total.toLocaleString()} live />
            <StatTile
              label="Sales so far"
              value={`${summary.sales.currency} ${summary.sales.total.toLocaleString()}`}
              sublabel={`${summary.sales.currency} ${summary.sales.today.toLocaleString()} today`}
              live
            />
            <StatTile
              label="Instagram followers"
              value={summary.instagram.followers?.toLocaleString() ?? "—"}
              live={summary.instagram.live}
            />
            <StatTile label="Orders today" value={summary.orders.today.total.toLocaleString()} live />
          </section>

          <section className="panel-grid">
            <div className="panel">
              <h2>Instagram followers (trend)</h2>
              <Sparkline data={summary.instagram.history} />
            </div>
            <div className="panel">
              <h2>New orders today, by channel</h2>
              <OrdersBreakdown today={summary.orders.today} />
            </div>
          </section>

          <section className="panel">
            <h2>Recent orders</h2>
            <OrdersFeed orders={summary.orders.recent} />
          </section>

          <section className="panel">
            <h2>Recent events</h2>
            {summary.events.recent.length === 0 ? (
              <p className="orders-feed__empty">No events logged yet — add one via POST /api/events.</p>
            ) : (
              <ul className="events-list">
                {summary.events.recent.map((e) => (
                  <li key={e.id}>
                    <strong>{e.name}</strong> — {e.date}
                    {e.location ? ` · ${e.location}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
