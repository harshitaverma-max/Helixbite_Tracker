import { Router } from "express";
import { db } from "../db.js";

export const ordersRouter = Router();

ordersRouter.get("/orders", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(db.listOrders(limit));
});
