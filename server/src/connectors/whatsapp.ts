// Real source: WhatsApp Business Platform (Meta Cloud API) webhooks. Orders
// arrive as a message of type "order" when a customer checks out via your
// catalog inside a chat:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#orders-message-webhook
//
// Set up: create a Meta app -> WhatsApp product -> Configuration -> Webhook,
// point it at POST /api/webhooks/whatsapp, subscribe to the "messages" field,
// and set WHATSAPP_VERIFY_TOKEN (used only for the GET handshake below — the
// order data itself isn't signed the way Shopify/Woo webhooks are, so treat
// the endpoint as append-only and reconcile against WhatsApp Business
// Manager periodically if you need stronger guarantees).

export interface NormalizedWhatsappOrder {
  externalId: string;
  amount: number;
  currency: string;
  customer?: string;
  status: string;
}

export function verifyHandshake(mode: string | undefined, token: string | undefined): boolean {
  return mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN;
}

// Extracts order messages from a Cloud API webhook payload. Returns [] for
// any non-order event (status updates, plain text messages, etc.) so the
// route can just iterate the result.
export function extractOrders(payload: any): NormalizedWhatsappOrder[] {
  const orders: NormalizedWhatsappOrder[] = [];
  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const messages = change?.value?.messages ?? [];
      for (const message of messages) {
        if (message.type !== "order") continue;
        const order = message.order;
        const total =
          (order?.product_items ?? []).reduce(
            (sum: number, item: any) => sum + Number(item.item_price ?? 0) * Number(item.quantity ?? 1),
            0,
          ) ?? 0;
        orders.push({
          externalId: message.id,
          amount: total,
          currency: order?.currency ?? "INR",
          customer: change?.value?.contacts?.[0]?.profile?.name,
          status: "received",
        });
      }
    }
  }

  return orders;
}
