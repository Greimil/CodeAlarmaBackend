import { Router } from "express";
import { getFilteredEventsController } from "./quality.controller";
import {filterEventsMiddleware} from "@/middleware/filterEventsMiddleware"

const router = Router()


router.get("/eventosProcesados", filterEventsMiddleware, getFilteredEventsController)

// router.get("/eventosProcesados/reportes",  )





export default router