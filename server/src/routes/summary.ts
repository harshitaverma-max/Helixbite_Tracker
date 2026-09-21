import { Router } from "express";
import { buildSummary } from "../services/metrics.js";

export const summaryRouter = Router();

summaryRouter.get("/summary", (_req, res) => {
  res.json(buildSummary());
});
