import { Router } from "express";
import qualityRouter from "./api/quality/quality.router";
import monitoringRouter from "./api/monitoring/monitoring.router";

const router = Router();

router.use("/quality", qualityRouter);
router.use("/monitoring", monitoringRouter);

export default router;
