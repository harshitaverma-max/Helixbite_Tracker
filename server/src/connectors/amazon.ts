import { db } from "../db.js";
import { broadcast } from "../services/stream.js";

// Real source: Amazon Selling Partner API (SP-API), `GET orders/v0/orders`
// filtered by `LastUpdatedAfter`. Amazon retired the AWS SigV4 signing
// requirement for RESTful calls, so all that's needed per request is a
// Login-With-Amazon (LWA) access token in the `x-amz-access-token` header —
// no AWS IAM credentials.
//
// To go live, set in .env:
//   AMAZON_SP_API_REFRESH_TOKEN   — from the seller's one-time authorization
//                                    (Seller Central > Apps & Services >
//                                    Develop Apps, or the OAuth redirect for
//                                    a public app)
//   AMAZON_SP_API_CLIENT_ID       — LWA client ID for your SP-API app
//   AMAZON_SP_API_CLIENT_SECRET   — LWA client secret
//   AMAZON_SP_API_MARKETPLACE_ID  — e.g. ATVPDKIKX0DER for amazon.com (US)
//   AMAZON_SP_API_REGION          — na | eu | fe (default: na)
// https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api
//
// Buyer name/address require a Restricted Data Token (a separate call to
// `tokens/2021-03-01/restrictedDataToken`) since they're PII — left out here
// since order totals/status don't need it; add it if you need customer names.

const REGION_ENDPOINTS: Record<string, string> = {
  na: "https://sellingpartnerapi-na.amazon.com",
  eu: "https://sellingpartnerapi-eu.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};

interface RawOrder {
  externalId: string;
  amount: number;
  currency: string;
  customer?: string;
  status: string;
  receivedAt: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN!;
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID!;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET!;

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`LWA token exchange failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early so a poll never runs on an about-to-expire token.
  cachedAccessToken = { token: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
  return cachedAccessToken.token;
}

// Tracks the last successful poll so each call only asks for what's new,
// instead of re-fetching the same recent-orders window every 5 minutes.
let lastPolledAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

async function fetchLiveOrders(): Promise<RawOrder[] | null> {
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
  const marketplaceId = process.env.AMAZON_SP_API_MARKETPLACE_ID;
  if (!refreshToken || !clientId || !clientSecret || !marketplaceId) return null;

  const region = process.env.AMAZON_SP_API_REGION ?? "na";
  const endpoint = REGION_ENDPOINTS[region];
  if (!endpoint) {
    console.error(`[amazon] unknown AMAZON_SP_API_REGION "${region}", expected na/eu/fe`);
    return null;
  }

  const accessToken = await getAccessToken();
  const sinceCutoff = lastPolledAt;
  const url = new URL("/orders/v0/orders", endpoint);
  url.searchParams.set("MarketplaceIds", marketplaceId);
  url.searchParams.set("LastUpdatedAfter", sinceCutoff);

  const res = await fetch(url, {
    headers: { "x-amz-access-token": accessToken, "content-type": "application/json" },
  });

  if (!res.ok) {
    console.error(`[amazon] Orders API error ${res.status}: ${await res.text()}`);
    return null;
  }

  const body = (await res.json()) as {
    payload?: {
      Orders?: {
        AmazonOrderId: string;
        OrderStatus: string;
        PurchaseDate: string;
        OrderTotal?: { Amount: string; CurrencyCode: string };
      }[];
    };
  };

  lastPolledAt = new Date().toISOString();

  return (body.payload?.Orders ?? []).map((order) => ({
    externalId: order.AmazonOrderId,
    amount: Number(order.OrderTotal?.Amount ?? 0),
    currency: order.OrderTotal?.CurrencyCode ?? "USD",
    status: order.OrderStatus,
    receivedAt: order.PurchaseDate,
  }));
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
  let incoming: RawOrder[];
  try {
    const live = await fetchLiveOrders();
    incoming = live ?? [mockNewOrder()].filter((o): o is RawOrder => o !== null);
  } catch (err) {
    console.error("[amazon] poll failed", err);
    return;
  }

  for (const raw of incoming) {
    if (db.orderExists("amazon", raw.externalId)) continue;
    const order = db.addOrder({ source: "amazon", ...raw });
    broadcast("order", order);
  }
}
