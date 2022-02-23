import { Router } from "express";
import { IEventRepo } from "../db/repo";

export const txRouter = (repo: IEventRepo): Router => {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const events = await repo.getAllEvents(
        req.query.from?.toString(),
        req.query.to?.toString(),
        req.query.fromHash?.toString(),
        req.query.chainName?.toString()
      );
      res.status(200).json(events);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/dashboard", async (req: any, res) => {
    //req.app.get("io").emit("msg", "alef");
    try {
      const { period } = req.query;

      const number = await repo.getDashboard(Number(period));

      res.status(200).json(number);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });
  return router;
};
