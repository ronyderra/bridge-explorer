import { Router } from "express";
import { IEventRepo } from "../db/repo";
import issueSheet from "../services/issueSheet";
import { Mailer } from "../services/mailer";
import axios from "axios";
import config from "../config";
import { captchaProtected } from "../db/helpers";
import { QueryOrderKeys } from "@mikro-orm/core";

import { generateCSV } from "../generateCSV";

export const txRouter = (repo: IEventRepo): Router => {
  const router = Router();
  router.get("/", async (req, res) => {
   
    try {
      const docs = await repo.getAllEvents(
        req.query.sort?.toString(),
        req.query.from?.toString(),
        req.query.status?.toString(),
        req.query.fromHash?.toString(),
        req.query.chainName?.toString(),
        req.query.pendingSearch?.toString(),
        Number(req.query.offset)
      );
      res.status(200).json({ events: docs?.events, count: docs?.count });
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

  router.post("/reportIssue", captchaProtected, async (req: any, res) => {
    try {

      const event = await repo.findEventByHash(req.body.txHash);

      if (!event || !req.body.txHash) {
        res.status(200).json({ message: "Hash not found" });
        return;
      }

      await issueSheet(req.body);

      //await new Mailer().sendFormFill(req.body, "TX Explorer");
      res.json({ message: "Success" });
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/csv", captchaProtected, async (req, res) => {
    const startDate = req.query?.startDate as string | undefined;
    const endDate = req.query?.endDate as string | undefined;
    const searchQuery = req.query?.searchQuery as string | undefined;


    try {
      await generateCSV(repo, startDate, endDate, searchQuery);
      return res.sendFile('events.csv', { root: require('path').join(__dirname, '../../') });
    } catch (error) {
      console.log(error);
    }

    
  });


  return router;
};
function orm(orm: any): IEventRepo {
  throw new Error("Function not implemented.");
}
