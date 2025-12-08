import type { EventEvaluated } from '@/types';
import { prisma } from "@/lib/prisma";
import type { Prisma } from '@/generated/prisma';

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

export const mapEventEvaluatedToPrisma = (
  event: EventEvaluated
): Prisma.processedEventsCreateInput => ({
  id: event.id,
  createdAt: parseDate(event.createdAt),
  processedAt: parseDate(event.processedAt),
  operator: event.operator ?? 'UNKNOWN',
  operatorNotes: event.operatorNotes ?? '',
  accountId: event.accountId,
  code: event.code,
  accountObservation: event.accountObservation ?? '',
  evaluacionLlamada: event.evaluacionLlamada ?? '',
  cumplimientoProtocolo: event.cumplimientoProtocolo ?? 'Cumplimiento parcial',
  esFaltaRecurrente: event.esFaltaRecurrente ?? false,
  cumpleSLA: event.cumpleSLA ?? false,
  puntuacionLlamada: event.puntuacionLlamada ?? 0,
  evaluacionQA: event.evaluacionQA ?? 0,
  accionRecomendada: event.accionRecomendada ?? 'Ninguna',
  conclusion: event.conclusion ?? '',
});