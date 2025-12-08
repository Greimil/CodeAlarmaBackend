import { Router } from "express";
import qualityRouter from "./api/quality/quality.router";

const router = Router();

router.use("/", qualityRouter);

export default router;
