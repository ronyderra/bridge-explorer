import { Router } from "express";
import { IEventRepo } from "../db/repo";

export const txRouter = (repo: IEventRepo): Router => {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const events = await repo.getAllEvents(
        req.query.from?.toString(),
        req.query.status?.toString(),
        req.query.fromHash?.toString(),
        req.query.chainName?.toString(),
        req.query.pendingSearch?.toString()
      );
      res.status(200).json(events);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/getMetrics", async (req: any, res) => {
    try {
      const metrics = await repo.getMetrics();

      res.status(200).json(metrics);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/dashboard", async (req: any, res) => {
    try {
      const dailyData = await repo.getDashboard(req.query.period)
      res.status(200).json(dailyData);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });
  return router;
};
