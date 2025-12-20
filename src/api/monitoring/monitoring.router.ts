import { Router } from "express";
import { startMonitoringController, getActiveSessionController } from "./monitoring.controller";

const router = Router();

router.post("/start", startMonitoringController);
router.get("/active", getActiveSessionController);

export default router;

