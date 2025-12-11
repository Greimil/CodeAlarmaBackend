import type { EventoProcesado } from "@/types";
import type { EventoProcesadoResponseDTO } from "../dto/eventosProcesados.dto";
import {
  parse,
  differenceInMilliseconds,
  differenceInMinutes,
  isValid,
} from "date-fns";

export const mapAPiRes = (
  data: EventoProcesado[],
  currentTime?: Date
): EventoProcesadoResponseDTO[] => {
  const res: EventoProcesadoResponseDTO[] = [];
  const formatoEsperado = "MM/dd/yyyy hh:mm:ss a";
  const now = currentTime ?? new Date();

  for (const evento of data) {
    if (!evento.rec_tFechaRecepcion || !evento.rec_tFechaProceso) {
      console.warn(`Evento ${evento.Id} sin fechas válidas, omitiendo...`);
      continue;
    }

    const fechaCreacion = parse(
      String(evento.rec_tFechaRecepcion),
      formatoEsperado,
      new Date()
    );
    const fechaProcesado = parse(
      String(evento.rec_tFechaProceso),
      formatoEsperado,
      new Date()
    );

    if (!isValid(fechaCreacion) || !isValid(fechaProcesado)) {
      console.warn(
        `Evento ${evento.Id} con fechas inválidas: rec_tFechaRecepcion="${evento.rec_tFechaRecepcion}", rec_tFechaProceso="${evento.rec_tFechaProceso}"`
      );
      continue;
    }

    let nowForComparison: Date;
    if (currentTime) {
      nowForComparison = new Date(
        currentTime.getUTCFullYear(),
        currentTime.getUTCMonth(),
        currentTime.getUTCDate(),
        currentTime.getUTCHours(),
        currentTime.getUTCMinutes(),
        currentTime.getUTCSeconds()
      );
    } else {
      nowForComparison = new Date();
    }
    const diffMinutes = Math.abs(
      differenceInMinutes(nowForComparison, fechaCreacion)
    );
    if (diffMinutes > 60) {
      console.warn(
        `Evento ${evento.Id} fuera de ventana: ${diffMinutes} minutos de diferencia`
      );
      continue;
    }

    const accountId = evento.rec_iidcuenta ?? evento.cue_ncuenta;
    const code = evento.cod_cdescripcion ?? evento.rec_calarma;
    const zone = evento.rec_czona ?? evento.zonas_ccodigo;

    if (!accountId || !code || !zone) {
      console.warn(
        `Evento ${evento.Id} sin campos requeridos: accountId="${accountId}", code="${code}", zone="${zone}"`
      );
      continue;
    }

    res.push({
      eventID: evento.Id,
      accountId,
      code,
      status: evento.rec_nestado ?? evento.rec_idResolucion,
      zone,
      operator: evento.ope_cnombre ?? "Grey",
      operatorNotes: evento.rec_cObservaciones,
      accountObservation: evento.cue_cobservacion,
      createdAt: fechaCreacion,
      processedAt: fechaProcesado,
      slaTimeInMiliSeconds: Math.abs(
        differenceInMilliseconds(fechaCreacion, fechaProcesado)
      ),
    });
  }

  return res;
};
