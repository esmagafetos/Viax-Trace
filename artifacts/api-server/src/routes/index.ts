import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import analysesRouter from "./analyses";
import dashboardRouter from "./dashboard";
import processRouter from "./process";
import condominiumRouter from "./condominium";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(analysesRouter);
router.use(dashboardRouter);
router.use(processRouter);
router.use(condominiumRouter);

export default router;
