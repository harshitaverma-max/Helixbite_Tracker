export type OrderSource = "amazon" | "website" | "whatsapp";

export interface EventRecord {
  id: string;
  name: string;
  date: string; // ISO date the event took/takes place
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  source: OrderSource;
  externalId: string;
  amount: number;
  currency: string;
  customer?: string;
  status: string;
  receivedAt: string; // ISO timestamp
}

export interface MetricSnapshot {
  id: string;
  metric: "instagram_followers";
  value: number;
  recordedAt: string;
}

export interface DbShape {
  events: EventRecord[];
  orders: OrderRecord[];
  metricSnapshots: MetricSnapshot[];
}
