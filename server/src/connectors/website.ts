import { createHmac, timingSafeEqual } from "node:crypto";

// Real source: your storefront's native order webhook, pushed the moment a
// checkout completes — no polling needed.
//   Shopify:   Settings -> Notifications -> Webhooks -> "Order creation",
//              pointed at POST /api/webhooks/website. Verify with
//              SHOPIFY_WEBHOOK_SECRET (HMAC-SHA256 over the raw body, header
//              `X-Shopify-Hmac-Sha256`).
//   WooCommerce: WooCommerce -> Settings -> Advanced -> Webhooks -> "Order
//              created", secret in WEBSITE_WEBHOOK_SECRET, header
//              `X-WC-Webhook-Signature` (HMAC-SHA256, base64).
// Adjust `verifySignature` below to match whichever platform you're on; both
// use the same HMAC-over-raw-body shape.

export interface NormalizedWebsiteOrder {
  externalId: string;
  amount: number;
  currency: string;
  customer?: string;
  status: string;
}

export function verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.WEBSITE_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured yet -> scaffold/demo mode
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const gotBuf = Buffer.from(signatureHeader);
  return expectedBuf.length === gotBuf.length && timingSafeEqual(expectedBuf, gotBuf);
}

// Shopify-shaped payload by default; adjust field paths if you're on
// WooCommerce or another platform.
export function normalizeWebsiteOrder(payload: any): NormalizedWebsiteOrder {
  return {
    externalId: String(payload.id ?? payload.order_id ?? payload.number),
    amount: Number(payload.total_price ?? payload.total ?? 0),
    currency: String(payload.currency ?? "USD"),
    customer:
      payload.customer?.first_name || payload.billing?.first_name
        ? `${payload.customer?.first_name ?? payload.billing?.first_name ?? ""} ${
            payload.customer?.last_name ?? payload.billing?.last_name ?? ""
          }`.trim()
        : undefined,
    status: String(payload.financial_status ?? payload.status ?? "received"),
  };
}
