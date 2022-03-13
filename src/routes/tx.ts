import { Router } from "express";
import { IEventRepo } from "../db/repo";
import issueSheet from "../services/issueSheet";
import { Mailer } from "../services/mailer";
import axios from "axios";
import config from "../config";

export const txRouter = (repo: IEventRepo): Router => {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const docs = await repo.getAllEvents(
        req.query.from?.toString(),
        req.query.status?.toString(),
        req.query.fromHash?.toString(),
        req.query.chainName?.toString(),
        req.query.pendingSearch?.toString(),
        Number(req.query.offset)
      );
      res.status(200).json({events: docs?.events, count: docs?.count});
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
      const dailyData = await repo.getDashboard(req.query.period);
      res.status(200).json(dailyData);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.post("/reportIssue", async (req: any, res) => {
    try {
      if (!req.body.token) return res.status(401).json({ message: 'Unauthtorized' });
  
      const { data } = await axios(
        `https://www.google.com/recaptcha/api/siteverify?secret=${config.captcha_secret}&response=${
          req.body.token
        }`
      );

      if (!data?.success) return res.status(401).json({ message: 'Unauthtorized' });
      
      const event = await repo.findEventByHash(req.body.txHash);

      if (!event || !req.body.txHash) {
        res.status(404).json({message: "Hash not found"});
        return;
      }
      
      await issueSheet(req.body);

      await new Mailer().sendFormFill(req.body, "TX Explorer");
      res.json({message: "Success"});
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  return router;
};
