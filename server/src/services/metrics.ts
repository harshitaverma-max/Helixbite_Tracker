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

  const totalSales = orders.reduce((sum, o) => sum + o.amount, 0);
  const salesToday = ordersToday.reduce((sum, o) => sum + o.amount, 0);

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
      total: Math.round(totalSales * 100) / 100,
      today: Math.round(salesToday * 100) / 100,
      currency: orders[0]?.currency ?? "USD",
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
