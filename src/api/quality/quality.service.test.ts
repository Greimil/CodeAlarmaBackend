import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  calcularPuntuaciones,
  groupEvents,
  safeParseLLMResponse,
} from "./quality.service";
import { mapAPiRes } from "./mappers/QaMapper";
import type { EventoProcesado } from "@/types";
import type { EventoProcesadoResponseDTO } from "./dto/eventosProcesados.dto";
import { differenceInMilliseconds } from "date-fns";

describe("calcularPuntuaciones", () => {
  it("devuelve puntajes completos cuando todo cumple", () => {
    const result = calcularPuntuaciones({
      cumpleSLA: true,
      cumplimientoProtocolo: "Cumple protocolo",
      esFaltaRecurrente: false,
    });

    expect(result).toEqual({ puntuacionLlamada: 10, evaluacionQA: 100 });
  });

  it("aplica penalizaciones acumuladas y no baja de cero", () => {
    const result = calcularPuntuaciones({
      cumpleSLA: false,
      cumplimientoProtocolo: "Incumple protocolo",
      esFaltaRecurrente: true,
    });

    expect(result).toEqual({ puntuacionLlamada: 0, evaluacionQA: 0 });
  });
});

describe("safeParseLLMResponse", () => {
  it("parsea JSON envuelto en bloque ```json ... ```", () => {
    const wrapped = "```json\n{\n  \"foo\": 1,\n  \"bar\": \"ok\"\n}\n```";

    expect(safeParseLLMResponse(wrapped)).toEqual({ foo: 1, bar: "ok" });
  });

  it("elimina comillas externas simples antes de parsear", () => {
    const wrapped = '\'{"value":42}\'';

    expect(safeParseLLMResponse(wrapped)).toEqual({ value: 42 });
  });
});

describe("groupEvents", () => {
  const baseEvent: Partial<EventoProcesadoResponseDTO> = {
    accountId: "001",
    code: "ALARM",
    status: "OK",
    zone: "Z1",
    accountObservation: "Obs",
  };

  it("agrupa eventos equivalentes dentro de la ventana y conserva el más reciente", () => {
    const first: Partial<EventoProcesadoResponseDTO> = {
      ...baseEvent,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    };
    const second: Partial<EventoProcesadoResponseDTO> = {
      ...baseEvent,
      createdAt: new Date("2024-01-01T00:03:00.000Z"),
    };

    const grouped = groupEvents([first, second] as EventoProcesadoResponseDTO[]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.createdAt).toEqual(new Date("2024-01-01T00:03:00.000Z"));
    expect(grouped[0]?.zone?.trim()).toBe("Z1");
  });

  it("crea grupos separados cuando cambia la ventana o las claves base", () => {
    const withinWindow: Partial<EventoProcesadoResponseDTO> = {
      ...baseEvent,
      createdAt: new Date("2024-01-01T00:01:00.000Z"),
    };
    const outsideWindow: Partial<EventoProcesadoResponseDTO> = {
      ...baseEvent,
      zone: "Z2",
      createdAt: new Date("2024-01-01T00:10:00.000Z"),
    };

    const grouped = groupEvents([withinWindow, outsideWindow] as EventoProcesadoResponseDTO[], 5);

    expect(grouped).toHaveLength(2);
    const zones = grouped.map((e) => e.zone?.trim());
    expect(zones).toContain("Z1");
    expect(zones).toContain("Z2");
  });
});

describe("mapAPiRes", () => {
  // Mock del tiempo actual para controlar el filtrado de 60 minutos
  const mockCurrentTime = new Date("2024-01-15T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers({
      now: mockCurrentTime,
      toFake: ['Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createBaseEvento = (): Partial<EventoProcesado> => ({
    Id: "123",
    rec_iidcuenta: "ACC001",
    cod_cdescripcion: "ALARM_CODE",
    rec_czona: "ZONE1",
    rec_nestado: "OK",
    ope_cnombre: "John Doe",
    rec_cObservaciones: "Observaciones del operador",
    cue_cobservacion: "Observación de cuenta",
  });

  it("mapea correctamente un evento válido dentro de la ventana de 60 minutos", () => {
    // Usar fechas relativas al tiempo mockeado (12:00 PM)
    const evento: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM", // 30 minutos antes
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const result = mapAPiRes([evento] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      eventID: "123",
      accountId: "ACC001",
      code: "ALARM_CODE",
      status: "OK",
      zone: "ZONE1",
      operator: "John Doe",
      operatorNotes: "Observaciones del operador",
      accountObservation: "Observación de cuenta",
    });
    expect(result[0]?.createdAt).toBeInstanceOf(Date);
    expect(result[0]?.processedAt).toBeInstanceOf(Date);
    expect(result[0]?.slaTimeInMiliSeconds).toBeGreaterThan(0);
  });

  it("calcula correctamente el slaTimeInMiliSeconds", () => {
    const fechaRecepcion = "01/15/2024 11:30:00 AM";
    const fechaProceso = "01/15/2024 11:35:00 AM";
    
    const evento: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      rec_tFechaRecepcion: fechaRecepcion,
      rec_tFechaProceso: fechaProceso,
    };

    const result = mapAPiRes([evento] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    // 5 minutos = 5 * 60 * 1000 = 300000 ms
    // Usar aproximación para evitar problemas de precisión
    expect(result[0]?.slaTimeInMiliSeconds).toBeGreaterThanOrEqual(299000);
    expect(result[0]?.slaTimeInMiliSeconds).toBeLessThanOrEqual(301000);
  });

  it("filtra eventos fuera de la ventana de 60 minutos", () => {
    const eventoReciente: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "123",
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM", // 30 minutos antes
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const eventoAntiguo: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "456",
      rec_tFechaRecepcion: "01/15/2024 10:30:00 AM", // 90 minutos antes
      rec_tFechaProceso: "01/15/2024 10:35:00 AM",
    };

    const result = mapAPiRes([eventoReciente, eventoAntiguo] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]?.eventID).toBe("123");
  });

  it("usa campos alternativos cuando los principales no están disponibles", () => {
    const evento: Partial<EventoProcesado> = {
      Id: "123",
      cue_ncuenta: "ACC002", // Usa alternativa en lugar de rec_iidcuenta
      rec_calarma: "FALLBACK_CODE", // Usa alternativa en lugar de cod_cdescripcion
      zonas_ccodigo: "ZONE2", // Usa alternativa en lugar de rec_czona
      rec_idResolucion: "RESOLVED", // Usa alternativa en lugar de rec_nestado
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const result = mapAPiRes([evento] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      accountId: "ACC002",
      code: "FALLBACK_CODE",
      zone: "ZONE2",
      status: "RESOLVED",
    });
  });

  it("usa 'Grey' como operador por defecto cuando ope_cnombre no está disponible", () => {
    const evento: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      ope_cnombre: undefined,
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const result = mapAPiRes([evento] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]?.operator).toBe("Grey");
  });

  it("omite eventos con fechas inválidas", () => {
    const eventoValido: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "123",
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const eventoFechaInvalida: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "456",
      rec_tFechaRecepcion: "fecha-invalida",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const result = mapAPiRes([eventoValido, eventoFechaInvalida] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]?.eventID).toBe("123");
  });

  it("omite eventos sin fechas", () => {
    const eventoValido: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "123",
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const eventoSinFechas: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "456",
      rec_tFechaRecepcion: undefined,
      rec_tFechaProceso: undefined,
    };

    const result = mapAPiRes([eventoValido, eventoSinFechas] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]?.eventID).toBe("123");
  });

  it("omite eventos sin campos requeridos (accountId, code, zone)", () => {
    const eventoValido: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "123",
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const eventoSinCampos: Partial<EventoProcesado> = {
      Id: "456",
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
      // Sin accountId, code ni zone
    };

    const result = mapAPiRes([eventoValido, eventoSinCampos] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]?.eventID).toBe("123");
  });

  it("retorna array vacío cuando no hay eventos válidos", () => {
    const eventosInvalidos: Partial<EventoProcesado>[] = [
      {
        Id: "1",
        rec_tFechaRecepcion: "01/15/2024 10:00:00 AM", // Fuera de ventana (120 minutos antes)
        rec_tFechaProceso: "01/15/2024 10:05:00 AM",
      },
      {
        Id: "2",
        rec_tFechaRecepcion: "fecha-invalida",
        rec_tFechaProceso: "01/15/2024 11:35:00 AM",
      },
    ];

    const result = mapAPiRes(eventosInvalidos as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(0);
  });

  it("maneja correctamente eventos en el límite de 60 minutos", () => {
    const eventoExacto60Min: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "123",
      rec_tFechaRecepcion: "01/15/2024 11:00:00 AM", // Exactamente 60 minutos antes
      rec_tFechaProceso: "01/15/2024 11:05:00 AM",
    };

    const evento61Min: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      Id: "456",
      rec_tFechaRecepcion: "01/15/2024 10:59:00 AM", // 61 minutos antes
      rec_tFechaProceso: "01/15/2024 11:04:00 AM",
    };

    const result = mapAPiRes([eventoExacto60Min, evento61Min] as EventoProcesado[], mockCurrentTime);

    // El evento de exactamente 60 minutos debería incluirse (<= 60)
    expect(result).toHaveLength(1);
    expect(result[0]?.eventID).toBe("123");
  });

  it("maneja correctamente campos opcionales como undefined", () => {
    const evento: Partial<EventoProcesado> = {
      ...createBaseEvento(),
      rec_cObservaciones: undefined,
      cue_cobservacion: undefined,
      rec_tFechaRecepcion: "01/15/2024 11:30:00 AM",
      rec_tFechaProceso: "01/15/2024 11:35:00 AM",
    };

    const result = mapAPiRes([evento] as EventoProcesado[], mockCurrentTime);

    expect(result).toHaveLength(1);
    expect(result[0]?.operatorNotes).toBeUndefined();
    expect(result[0]?.accountObservation).toBeUndefined();
  });
});

