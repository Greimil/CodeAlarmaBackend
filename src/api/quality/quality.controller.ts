import { main } from "./QaAgent/QaAgent";
import { AIprocessReq } from "./quality.services";
import type { EventEvaluated } from "@/types";
import {type Request, type Response } from "express";

export const getFilteredEventsController = async (
  req: Request & { filteredEvents?: EventEvaluated[] },
  res: Response
) => {
  try {
    const events = req.filteredEvents;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: "filteredEvents no está definido o no es un array" });
    }

    const result = await AIprocessReq(events);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error en getFilteredEventsController:", err);
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};


// Buscar por nombre de operador
// por rango de fechas
// Si no se provee ningun argumento, entonces traer toda la data de todos los eventos
// por tipo de alarma
// por tipo de cuentaID


export const GetReportsController = async () => {









}
