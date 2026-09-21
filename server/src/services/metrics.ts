import { db } from "../db.js";
import type { OrderSource } from "../types.js";

const SOURCES: OrderSource[] = ["amazon", "website", "whatsapp"];

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function buildSummary() {
  const events = db.listEvents();
  const orders = db.listOrders();
  const followers = db.latestMetric("instagram_followers");
  const followersHistory = db.metricHistory("instagram_followers");

  const todayCutoff = startOfToday();
  const ordersToday = orders.filter((o) => o.receivedAt >= todayCutoff);

  // Orders can legitimately arrive in different currencies (e.g. USD via
  // Amazon/Website, INR via WhatsApp) — summing across currencies without
  // converting would produce a number that's both wrong and mislabeled, so
  // totals are kept separate per currency instead.
  const totalsByCurrency = new Map<string, { total: number; today: number }>();
  for (const order of orders) {
    const bucket = totalsByCurrency.get(order.currency) ?? { total: 0, today: 0 };
    bucket.total += order.amount;
    if (order.receivedAt >= todayCutoff) bucket.today += order.amount;
    totalsByCurrency.set(order.currency, bucket);
  }
  const salesByCurrency = [...totalsByCurrency.entries()]
    .map(([currency, { total, today }]) => ({
      currency,
      total: Math.round(total * 100) / 100,
      today: Math.round(today * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);

  const ordersBySource: Record<OrderSource, number> = { amazon: 0, website: 0, whatsapp: 0 };
  for (const source of SOURCES) {
    ordersBySource[source] = ordersToday.filter((o) => o.source === source).length;
  }

  return {
    events: {
      total: events.length,
      recent: events.slice(0, 5),
    },
    sales: {
      byCurrency: salesByCurrency,
    },
    instagram: {
      followers: followers?.value ?? null,
      lastUpdated: followers?.recordedAt ?? null,
      history: followersHistory,
      live: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN),
    },
    orders: {
      today: {
        ...ordersBySource,
        total: ordersToday.length,
      },
      recent: orders.slice(0, 10),
    },
    generatedAt: new Date().toISOString(),
  };
}
