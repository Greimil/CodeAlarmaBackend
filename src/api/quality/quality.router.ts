import { Router } from "express";
import { getFilteredEventsController } from "./quality.controller";
import {filterEventsMiddleware} from "@/middleware/filterEventsMiddleware"

const router = Router()


router.get("/eventosProcesados", filterEventsMiddleware, getFilteredEventsController)






// router.get("/qaEventos", async (req, res)=> {
  
//   try {
//     const data = await getProcessedEvent();
//     res.json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }

// })

export default router