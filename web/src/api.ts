export type OrderSource = "amazon" | "website" | "whatsapp";

export interface EventRecord {
  id: string;
  name: string;
  date: string;
  location?: string;
  notes?: string;
}

export interface OrderRecord {
  id: string;
  source: OrderSource;
  externalId: string;
  amount: number;
  currency: string;
  customer?: string;
  status: string;
  receivedAt: string;
}

export interface MetricSnapshot {
  value: number;
  recordedAt: string;
}

export interface CurrencyTotal {
  currency: string;
  total: number;
  today: number;
}

export interface Summary {
  events: { total: number; recent: EventRecord[] };
  sales: { byCurrency: CurrencyTotal[] };
  instagram: {
    followers: number | null;
    lastUpdated: string | null;
    history: MetricSnapshot[];
    live: boolean;
  };
  orders: {
    today: { amazon: number; website: number; whatsapp: number; total: number };
    recent: OrderRecord[];
  };
  generatedAt: string;
}

const API_BASE = "/api";

export async function fetchSummary(): Promise<Summary> {
  const res = await fetch(`${API_BASE}/summary`);
  if (!res.ok) throw new Error(`GET /summary failed: ${res.status}`);
  return res.json();
}

export function subscribeToLiveUpdates(onUpdate: () => void): () => void {
  const source = new EventSource(`${API_BASE}/stream`);
  source.addEventListener("order", onUpdate);
  source.addEventListener("instagram", onUpdate);
  source.addEventListener("event", onUpdate);
  return () => source.close();
}
