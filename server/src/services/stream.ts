import type { Response } from "express";

// Minimal Server-Sent Events hub: connected dashboards get pushed an event the
// moment a webhook lands an order or a poller records a new metric, instead of
// waiting for their next fetch interval.

const clients = new Set<Response>();

export function registerClient(res: Response) {
  clients.add(res);
}

export function unregisterClient(res: Response) {
  clients.delete(res);
}

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}
