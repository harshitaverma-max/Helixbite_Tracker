import { Router, json, raw } from "express";
import { db } from "../db.js";
import { normalizeWebsiteOrder, verifySignature } from "../connectors/website.js";
import { extractOrders, verifyHandshake } from "../connectors/whatsapp.js";
import { broadcast } from "../services/stream.js";

export const webhooksRouter = Router();

// Website (Shopify/WooCommerce order-created webhook). Needs the raw body to
// verify the HMAC signature before it's touched by any JSON parser.
webhooksRouter.post("/webhooks/website", raw({ type: "application/json" }), (req, res) => {
  const rawBody = req.body as Buffer;
  const signature =
    (req.headers["x-shopify-hmac-sha256"] as string | undefined) ??
    (req.headers["x-wc-webhook-signature"] as string | undefined);

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: "invalid signature" });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    return res.status(400).json({ error: "invalid JSON body" });
  }

  const normalized = normalizeWebsiteOrder(payload);
  if (db.orderExists("website", normalized.externalId)) {
    return res.status(200).json({ status: "duplicate, ignored" });
  }

  const order = db.addOrder({ source: "website", receivedAt: new Date().toISOString(), ...normalized });
  broadcast("order", order);
  res.status(201).json({ status: "ok" });
});

// WhatsApp Cloud API: GET is Meta's one-time verification handshake, POST is
// the actual event stream.
webhooksRouter.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (verifyHandshake(mode, token)) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

webhooksRouter.post("/webhooks/whatsapp", json(), (req, res) => {
  const orders = extractOrders(req.body);
  for (const normalized of orders) {
    if (db.orderExists("whatsapp", normalized.externalId)) continue;
    const order = db.addOrder({ source: "whatsapp", receivedAt: new Date().toISOString(), ...normalized });
    broadcast("order", order);
  }
  res.sendStatus(200);
});
