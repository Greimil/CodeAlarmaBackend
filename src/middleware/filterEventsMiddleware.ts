import {
  type EventoProcesado,
  type EventEvaluated,
  type ApiResponse,
} from "../types";
import { fetchEvents, groupEvents, searchDatabase } from "../api/quality/quality.services";
import { differenceInMinutes, format, formatDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const filterEventsMiddleware = async (
  req: any,
  res: any,
  next: () => void
) => {
  try {
    let { rows }: ApiResponse = await fetchEvents();

    rows = groupEvents(rows)
    
    console.log(rows.length)

    let now = new Date();
    let filteredEvents: EventEvaluated[] = [];

    await Promise.all(
      rows.map(async (evento: EventoProcesado) => {
        let createdAtEventDate = parseISODate(evento.rec_isoFechaRecepcion);

        if (!createdAtEventDate) return;

        const minutesDifference = Math.abs(
          differenceInMinutes(now, createdAtEventDate)
        );

        const exists = await searchDatabase(evento);

        if (minutesDifference < 60 && exists) {
          filteredEvents.push({
            eventID: evento.Id,
            operator: evento.operadorAtendiendoCuenta || "Grey",
            createdAt: format(
              createdAtEventDate,
              "d 'de' MMMM 'de' yyyy, HH:mm",
              { locale: es }
            ),
            processedAt: format(
              parseISODate(evento.rec_isoFechaProceso)!,
              "d 'de' MMMM 'de' yyyy, HH:mm",
              { locale: es }
            ),
            accountId: evento.rec_iidcuenta,
            code: evento.rec_calarma,
            operatorNotes: evento.rec_cObservaciones,
          });
        }
      })
    );

    req.filteredEvents = filteredEvents;

    if (filteredEvents.length == 0) {
      res.json("No new Events");
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

function parseISODate(isoString: string): Date | null {
  if (!isoString || typeof isoString !== "string") return null;

  const fecha = parseISO(isoString);

  if (isNaN(fecha.getTime())) {
    console.warn("Fecha ISO inválida:", isoString);
    return null;
  }

  return fecha;
}
