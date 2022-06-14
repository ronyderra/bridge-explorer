import { Router } from "express";
import issueSheet from "../services/issueSheet";
import { Mailer } from "../services/mailer";
import { captchaProtected } from "../business-logic/helpers";
import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import createEventRepo from "../business-logic/repo";
import { generateCSV } from "../generateCSV";
import { Request, Response, NextFunction } from "express";

export const txRouter = (em: EntityManager<IDatabaseDriver<Connection>>): Router => {
  const router = Router();

  const createContext = (req: Request, res: Response, next: NextFunction) => {
    res.locals.em = em.fork()
    next()
  }

  router.get("/", createContext, async (req, res) => {
    try {
      const docs = await createEventRepo(res.locals.em).getAllEvents(
        req.query.sort?.toString(),
        req.query.fromChain?.toString(),
        req.query.status?.toString(),
        req.query.fromHash?.toString(),
        req.query.toHash?.toString(),
        req.query.chainName?.toString(),
        req.query.pendingSearch?.toString(),
        req.query.targetAddress?.toString(),
        Number(req.query.offset)
      );
      res.status(200).json({ events: docs?.events, count: docs?.count });
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/getMetrics", createContext, async (req: any, res) => {
    try {
      const metrics = await createEventRepo(res.locals.em).getMetrics();

      res.status(200).json(metrics);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/dashboard", createContext, async (req: any, res) => {
    try {
      const dailyData = await createEventRepo(res.locals.em).getDashboard(req.query.period);
      res.status(200).json(dailyData);
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.post("/reportIssue", captchaProtected, createContext, async (req: any, res) => {
    try {
      const event = await createEventRepo(res.locals.em).findEventByHash(req.body.txHash);
      if (!event || !req.body.txHash) {
        res.status(200).json({ message: "Hash not found" });
        return;
      }
      await issueSheet(req.body);
      await new Mailer().sendFormFill(req.body, "TX Explorer");
      res.json({ message: "Success" });
    } catch (e: any) {
      res.status(500).json({ message: e.toString() });
    }
  });

  router.get("/csv", captchaProtected, createContext, async (req, res) => {
    const startDate = req.query?.startDate as string | undefined;
    const endDate = req.query?.endDate as string | undefined;
    const searchQuery = req.query?.searchQuery as string | undefined;

    try {
      await generateCSV(createEventRepo(res.locals.em), startDate, endDate, searchQuery);
      return res.sendFile('events.csv', { root: require('path').join(__dirname, '../../') });
    } catch (error) {
      console.log(error);
    }
  });
  return router;
};
