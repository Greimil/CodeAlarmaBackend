import type { EventEvaluated } from "@/types";

/**
 * Parámetros opcionales de filtrado para `/api/eventosProcesados`.
 * Se espera que lleguen como query params en un request GET.
 */
export interface EventosProcesadosQueryDTO {
  /** Nombre o login del operador que atendió el evento */
  operador?: string;
  /** Fecha de inicio del rango (ISO 8601) */
  fechaDesde?: string;
  /** Fecha de fin del rango (ISO 8601) */
  fechaHasta?: string;
  /** Código o descripción del tipo de alarma */
  tipoAlarma?: string;
  /** Identificador de la cuenta involucrada */
  cuentaId?: string;
  /** Límite máximo de registros a devolver */
  limite?: number;
}

/**
 * Estructura de cada evento procesado que se devuelve al cliente.
 * Reutiliza el tipo de negocio `EventEvaluated`.
 */
export type EventoProcesadoResponseDTO = EventEvaluated;

/**
 * Respuesta completa del endpoint `/api/eventosProcesados`.
 * Actualmente se devuelve una lista simple de eventos evaluados.
 */
export type EventosProcesadosResponseDTO = EventoProcesadoResponseDTO[];
