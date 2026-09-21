import { Router } from "express";
import { registerClient, unregisterClient } from "../services/stream.js";

export const streamRouter = Router();

// Server-Sent Events: the dashboard opens one long-lived connection and gets
// pushed `order` / `instagram` / `event` messages as they happen, instead of
// only finding out on its next poll.
streamRouter.get("/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("retry: 2000\n\n");

  registerClient(res);
  req.on("close", () => unregisterClient(res));
});
