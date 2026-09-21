import { db } from "../db.js";
import { broadcast } from "../services/stream.js";

// Real source: Amazon Selling Partner API (SP-API), `orders/v0/orders`
// filtered by `LastUpdatedAfter`. Requires LWA OAuth credentials and a
// restricted data token for buyer info: https://developer-docs.amazon.com/sp-api
//
// Set AMAZON_SP_API_REFRESH_TOKEN (and the LWA client id/secret) in .env to go
// live and replace `fetchLiveOrders` below. Amazon has no webhook for orders
// (notifications require SQS + EventBridge setup), so this stays a poller even
// in production — 5 minutes is a reasonable interval that stays well within
// SP-API rate limits.

interface RawOrder {
  externalId: string;
  amount: number;
  currency: string;
  customer?: string;
  status: string;
  receivedAt: string;
}

async function fetchLiveOrders(): Promise<RawOrder[] | null> {
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;
  if (!refreshToken) return null;

  // TODO: exchange refreshToken for an LWA access token, then call
  // GET https://sellingpartnerapi-<region>.amazon.com/orders/v0/orders
  // with MarketplaceIds + LastUpdatedAfter, and map the response's
  // `Orders[]` into RawOrder[]. Left unimplemented pending real credentials.
  console.warn("[amazon] AMAZON_SP_API_REFRESH_TOKEN is set but the SP-API client isn't wired up yet.");
  return null;
}

function mockNewOrder(): RawOrder | null {
  // Roughly 1-in-4 poll cycles produces a new demo order.
  if (Math.random() > 0.25) return null;
  return {
    externalId: `AMZ-${Date.now()}`,
    amount: Math.round((15 + Math.random() * 60) * 100) / 100,
    currency: "USD",
    status: "Pending",
    receivedAt: new Date().toISOString(),
  };
}

export async function pollAmazonOrders(): Promise<void> {
  const live = await fetchLiveOrders();
  const incoming = live ?? [mockNewOrder()].filter((o): o is RawOrder => o !== null);

  for (const raw of incoming) {
    if (db.orderExists("amazon", raw.externalId)) continue;
    const order = db.addOrder({ source: "amazon", ...raw });
    broadcast("order", order);
  }
}
