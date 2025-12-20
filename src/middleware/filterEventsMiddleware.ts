import {
  type EventoProcesado,
  type EventEvaluated,
  type ApiResponse,
} from "../types";
import {
  fetchEvents,
  filterEventsDb,
  groupEvents,
  searchDatabase,
} from "../api/quality/quality.service";
import { differenceInMinutes, format, formatDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { mapAPiRes } from "../api/quality/mappers/QaMapper";
import { type Request, type Response, type NextFunction } from "express";

// export const filterEventsMiddleware = async (
//   req: any,
//   res: any,
//   next: () => void
// ) => {
//   try {
//     let { rows }: ApiResponse = await fetchEvents();

//     rows = groupEvents(rows)

//     console.log(rows.length)

//     let now = new Date();
//     let filteredEvents: EventEvaluated[] = [];

//     await Promise.all(
//       rows.map(async (evento: EventoProcesado) => {
//         let createdAtEventDate = parseISODate(evento.rec_isoFechaRecepcion);

//         if (!createdAtEventDate) return;

//         const minutesDifference = Math.abs(
//           differenceInMinutes(now, createdAtEventDate)
//         );

//         const exists = await searchDatabase(evento);

//         if (minutesDifference < 60 && exists) {
//           filteredEvents.push({
//             eventID: evento.Id,
//             operator: evento.operadorAtendiendoCuenta || "Grey",
//             createdAt: format(
//               createdAtEventDate,
//               "d 'de' MMMM 'de' yyyy, HH:mm",
//               { locale: es }
//             ),
//             processedAt: format(
//               parseISODate(evento.rec_isoFechaProceso)!,
//               "d 'de' MMMM 'de' yyyy, HH:mm",
//               { locale: es }
//             ),
//             accountId: evento.rec_iidcuenta,
//             code: evento.rec_calarma,
//             operatorNotes: evento.rec_cObservaciones,
//           });
//         }
//       })
//     );

//     req.filteredEvents = filteredEvents;

//     if (filteredEvents.length == 0) {
//       res.json("No new Events");
//     } else {
//       next();
//     }
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// };

// function parseISODate(isoString: string): Date | null {
//   if (!isoString || typeof isoString !== "string") return null;

//   const fecha = parseISO(isoString);

//   if (isNaN(fecha.getTime())) {
//     console.warn("Fecha ISO inválida:", isoString);
//     return null;
//   }

//   return fecha;
// }

export const filterEventsMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Obtener eventos de la API
    const apiResponse = await fetchEvents();
    
    if (!apiResponse || !apiResponse.success || !Array.isArray(apiResponse.rows)) {
      return res.status(500).json({ 
        error: "Error al obtener eventos de la API o respuesta inválida" 
      });
    }

    // Transformar la respuesta de la API
    let apiRes = mapAPiRes(apiResponse.rows);

    if (!apiRes || !Array.isArray(apiRes)) {
      return res.status(500).json({ 
        error: "Error al transformar los eventos" 
      });
    }

    // Agrupar eventos
    const groupedEvents = groupEvents(apiRes);

    if (!groupedEvents || !Array.isArray(groupedEvents)) {
      return res.status(500).json({ 
        error: "Error al agrupar los eventos" 
      });
    }

    // Filtrar eventos que ya están en la base de datos
    const filteredEvents = await filterEventsDb(groupedEvents);

    if (!filteredEvents || !Array.isArray(filteredEvents)) {
      return res.status(500).json({ 
        error: "Error al filtrar eventos de la base de datos" 
      });
    }

    // Pasar los eventos filtrados al siguiente middleware/controller
    (req as any).filteredEvents = filteredEvents;

    // Si no hay eventos nuevos, responder directamente
    if (filteredEvents.length === 0) {
      return res.status(200).json({ 
        message: "No hay eventos nuevos para procesar",
        count: 0 
      });
    }

    // Continuar al siguiente middleware/controller
    next();
  } catch (err) {
    // Responder con error apropiado
    const errorMessage = err instanceof Error 
      ? err.message 
      : "Error desconocido al procesar eventos";
    
    return res.status(500).json({ 
      error: "Error interno del servidor",
      message: errorMessage 
    });
  }
};

// Transformar la respuesta api a la data esperada
// Filtrar todos los eventos por tiempo, digase solo los eventos que han ocurrido en los ultimos 60 minutos
// agrupar eventos por grupos
// filtrar eventos ya cubiertos en la BBDD
