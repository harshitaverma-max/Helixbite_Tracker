import "dotenv/config";
import cors from "cors";
import express from "express";
import { eventsRouter } from "./routes/events.js";
import { ordersRouter } from "./routes/orders.js";
import { streamRouter } from "./routes/stream.js";
import { summaryRouter } from "./routes/summary.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { startScheduler } from "./scheduler.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());

// Webhook routes need the raw body for signature verification, so they're
// mounted before the global json() parser.
app.use("/api", webhooksRouter);

app.use(express.json());
app.use("/api", summaryRouter);
app.use("/api", eventsRouter);
app.use("/api", ordersRouter);
app.use("/api", streamRouter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Helixbite Tracker API listening on http://localhost:${PORT}`);
  startScheduler();
});
