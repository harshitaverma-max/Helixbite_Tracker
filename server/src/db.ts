import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbShape, EventRecord, MetricSnapshot, OrderRecord } from "./types.js";

// Storage note: this is a flat-file JSON store so the scaffold runs with zero
// native/external dependencies. It is intentionally the only place that knows
// about the storage format — swap this module for a Postgres/Prisma client
// later and nothing outside `db.ts` needs to change.

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_FILE = join(DATA_DIR, "db.json");

function emptyDb(): DbShape {
  return { events: [], orders: [], metricSnapshots: [] };
}

function load(): DbShape {
  if (!existsSync(DB_FILE)) return emptyDb();
  try {
    const raw = readFileSync(DB_FILE, "utf-8");
    return { ...emptyDb(), ...JSON.parse(raw) } as DbShape;
  } catch {
    return emptyDb();
  }
}

let cache: DbShape = load();

function persist() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const db = {
  // events
  listEvents(): EventRecord[] {
    return [...cache.events].sort((a, b) => b.date.localeCompare(a.date));
  },
  addEvent(input: Omit<EventRecord, "id" | "createdAt">): EventRecord {
    const record: EventRecord = { ...input, id: id("evt"), createdAt: new Date().toISOString() };
    cache.events.push(record);
    persist();
    return record;
  },

  // orders
  listOrders(limit?: number): OrderRecord[] {
    const sorted = [...cache.orders].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  },
  orderExists(source: OrderRecord["source"], externalId: string): boolean {
    return cache.orders.some((o) => o.source === source && o.externalId === externalId);
  },
  addOrder(input: Omit<OrderRecord, "id">): OrderRecord {
    const record: OrderRecord = { ...input, id: id("ord") };
    cache.orders.push(record);
    persist();
    return record;
  },

  // metrics (e.g. instagram followers over time)
  addMetricSnapshot(input: Omit<MetricSnapshot, "id">): MetricSnapshot {
    const record: MetricSnapshot = { ...input, id: id("met") };
    cache.metricSnapshots.push(record);
    persist();
    return record;
  },
  latestMetric(metric: MetricSnapshot["metric"]): MetricSnapshot | undefined {
    return [...cache.metricSnapshots]
      .filter((m) => m.metric === metric)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  },
  metricHistory(metric: MetricSnapshot["metric"], limit = 48): MetricSnapshot[] {
    return [...cache.metricSnapshots]
      .filter((m) => m.metric === metric)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .slice(-limit);
  },
};
