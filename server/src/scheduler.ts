import cron from "node-cron";
import { pollAmazonOrders } from "./connectors/amazon.js";
import { pollInstagram } from "./connectors/instagram.js";

// Website and WhatsApp orders arrive via webhook (routes/webhooks.ts) and
// need no polling. Instagram and Amazon have no push mechanism, so they're
// polled on a schedule chosen to respect each API's rate limits:
//   - Instagram follower count changes slowly -> hourly is plenty.
//   - Amazon has no order webhook at all (SP-API is poll-only) -> every 5 min
//     is close to real-time without risking rate limits.

export function startScheduler() {
  cron.schedule("0 * * * *", () => {
    pollInstagram().catch((err) => console.error("[scheduler] instagram poll failed", err));
  });

  cron.schedule("*/5 * * * *", () => {
    pollAmazonOrders().catch((err) => console.error("[scheduler] amazon poll failed", err));
  });

  // Run once on boot so the dashboard isn't empty while waiting for the
  // first cron tick.
  pollInstagram().catch((err) => console.error("[scheduler] initial instagram poll failed", err));
  pollAmazonOrders().catch((err) => console.error("[scheduler] initial amazon poll failed", err));
}
