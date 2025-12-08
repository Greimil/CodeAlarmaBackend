import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { EventEvaluated } from "@/types";
import { parse } from 'date-fns';
import { es } from 'date-fns/locale';

const parseSpanishDate = (dateStr: string): Date => {
  return parse(
    dateStr,
    "d 'de' MMMM 'de' yyyy, HH:mm",
    new Date(),
    { locale: es }
  );
};


export const toPrismaProcessedEvent = (event: EventEvaluated): Prisma.processedEventsCreateManyInput => {
  return {
    eventID: event.eventID,
    createdAt: parseSpanishDate(event.createdAt),
    processedAt: parseSpanishDate(event.processedAt),
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
}


