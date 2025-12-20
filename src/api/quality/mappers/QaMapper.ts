import type { EventoProcesado, EventEvaluated } from "@/types";
import type { EventoProcesadoResponseDTO } from "../dto/eventosProcesados.dto";
import type { Prisma } from "@/generated/prisma";
import {
  parse,
  differenceInMilliseconds,
  differenceInMinutes,
  isValid,
} from "date-fns";

/**
 * Mapea eventos de la API externa a DTOs de respuesta
 */
export const mapAPiRes = (
  data: EventoProcesado[],
  currentTime?: Date
): EventoProcesadoResponseDTO[] => {
  const res: EventoProcesadoResponseDTO[] = [];
  const formatoEsperado = "MM/dd/yyyy hh:mm:ss a";
  const now = currentTime ?? new Date();

  for (const evento of data) {
    if (!evento.rec_tFechaRecepcion || !evento.rec_tFechaProceso) {
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
      continue;
    }

    const accountId = evento.rec_iidcuenta ?? evento.cue_ncuenta;
    const code = evento.cod_cdescripcion ?? evento.rec_calarma;
    const zone = evento.rec_czona ?? evento.zonas_ccodigo;

    if (!accountId || !code || !zone) {
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

/**
 * Mapea eventos evaluados a formato Prisma para inserción en base de datos
 */
export const toPrismaProcessedEvent = (
  event: EventEvaluated
): Prisma.processedEventsCreateManyInput => {
  return {
    eventID: event.eventID,
    createdAt: event.createdAt,
    processedAt: event.processedAt,
    operator: event.operator ?? "Sistema",
    operatorNotes: event.operatorNotes ?? null,
    accountId: event.accountId,
    code: event.code,
    accountObservation: event.accountObservation ?? null,
    evaluacionLlamada: event.evaluacionLlamada ?? "Pendiente",
    cumplimientoProtocolo: event.cumplimientoProtocolo ?? "Incumple protocolo",
    esFaltaRecurrente: event.esFaltaRecurrente ?? false,
    cumpleSLA: event.cumpleSLA ?? false,
    puntuacionLlamada: event.puntuacionLlamada ?? 0,
    evaluacionQA: event.evaluacionQA ?? 0,
    accionRecomendada: event.accionRecomendada ?? "Ninguna",
  };
};
