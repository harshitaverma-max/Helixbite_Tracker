import { db } from "../db.js";
import { broadcast } from "../services/stream.js";

// Real source: Instagram Graph API, `GET /{ig-user-id}?fields=followers_count`.
// Needs a Business/Creator account linked to a Facebook Page, and a long-lived
// access token: https://developers.facebook.com/docs/instagram-api/getting-started
//
// Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in .env to go
// live. Until then this falls back to a slowly-growing mock so the dashboard
// has something to show.

async function fetchLiveFollowerCount(): Promise<number | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !igUserId) return null;

  const url = `https://graph.facebook.com/v19.0/${igUserId}?fields=followers_count&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[instagram] Graph API error ${res.status}: ${await res.text()}`);
    return null;
  }
  const body = (await res.json()) as { followers_count?: number };
  return body.followers_count ?? null;
}

function mockFollowerCount(): number {
  const previous = db.latestMetric("instagram_followers");
  const base = previous?.value ?? 4200;
  // Small organic-looking drift so the demo dashboard feels "alive".
  const drift = Math.round(Math.random() * 6) - 1;
  return Math.max(0, base + drift);
}

export async function pollInstagram(): Promise<void> {
  const live = await fetchLiveFollowerCount();
  const value = live ?? mockFollowerCount();
  const snapshot = db.addMetricSnapshot({
    metric: "instagram_followers",
    value,
    recordedAt: new Date().toISOString(),
  });
  broadcast("instagram", snapshot);
}
