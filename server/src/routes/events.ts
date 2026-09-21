import { Router } from "express";
import { db } from "../db.js";
import { broadcast } from "../services/stream.js";

export const eventsRouter = Router();

eventsRouter.get("/events", (_req, res) => {
  res.json(db.listEvents());
});

// Manual entry: events (trade shows, pop-ups, expos) aren't behind an API,
// so this is the "source" for that number — wire up a small admin form
// against this endpoint, or call it from a spreadsheet automation.
eventsRouter.post("/events", (req, res) => {
  const { name, date, location, notes } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (typeof date !== "string" || !date.trim()) {
    return res.status(400).json({ error: "date is required" });
  }

  const event = db.addEvent({ name: name.trim(), date, location, notes });
  broadcast("event", event);
  res.status(201).json(event);
});
