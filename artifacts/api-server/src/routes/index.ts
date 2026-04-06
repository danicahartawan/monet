import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transcribeRouter from "./transcribe";
import extractRouter from "./extract";
import nodesRouter from "./nodes";
import edgesRouter from "./edges";
import exportRouter from "./exportRoutes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transcribeRouter);
router.use(extractRouter);
router.use(nodesRouter);
router.use(edgesRouter);
router.use(exportRouter);

export default router;
