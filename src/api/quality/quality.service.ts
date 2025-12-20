import { differenceInMinutes, format, formatDate, parseISO } from "date-fns";
import { da, es } from "date-fns/locale";
import { toPrismaProcessedEvent } from "./mappers/QaMapper";
import {
  type ApiResponse,
  type EvaluacionLLM,
  type EventEvaluated,
  type EventoProcesado,
} from "@/types";
import { prisma } from "@/lib/prisma";
import { llamadas } from "./QaAgent/systemPrompt";
import { main } from "./QaAgent/QaAgent";
import type { Prisma } from "@/generated/prisma";
import type { EventoProcesadoResponseDTO } from "./dto/eventosProcesados.dto";

const URL =
  "https://codealarma.net/rest/Search/ReporteHistorico?OrdenarFecha=DESC&Estados=3&page=1&start=0&limit=100&Cuentas=0";

export const fetchEvents = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "38E362E8-407D-4A3A-9C4A-02D28E97933C",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;

    if (!data.success || !Array.isArray(data.rows)) {
      throw new Error("Respuesta inesperada de la API");
    }

    return data;
  } catch (err) {
    throw err;
  }
};

export const calcularPuntuaciones = (evaluation: EvaluacionLLM) => {
  let puntuacionLlamada = 10;
  let evaluacionQA = 100;

  if (!evaluation.cumpleSLA) {
    puntuacionLlamada -= 4;
    evaluacionQA -= 40;
  }

  if (evaluation.cumplimientoProtocolo === "Incumple protocolo") {
    puntuacionLlamada -= 5;
    evaluacionQA -= 50;
  } else if (evaluation.cumplimientoProtocolo === "Cumplimiento parcial") {
    puntuacionLlamada -= 2;
    evaluacionQA -= 20;
  }
  if (evaluation.esFaltaRecurrente) {
    puntuacionLlamada -= 2;
    evaluacionQA -= 20;
  }

  return {
    puntuacionLlamada: Math.round(Math.max(0, puntuacionLlamada)),
    evaluacionQA: Math.round(Math.max(0, evaluacionQA)),
  };
};

export function safeParseLLMResponse(response: string): any {
  try {
    let jsonString = response.trim();

    if (
      (jsonString.startsWith('"') && jsonString.endsWith('"')) ||
      (jsonString.startsWith("'") && jsonString.endsWith("'"))
    ) {
      jsonString = jsonString.slice(1, -1);
    }

    jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    jsonString = jsonString
      .replace(/\\n/g, "")
      .replace(/\\t/g, "")
      .replace(/\\r/g, "");

    return JSON.parse(jsonString);
  } catch (error) {
    throw error;
  }
}

export const AIprocessReq = async (events: EventEvaluated[]) => {
  try {
    let result: EventEvaluated[] = [];

    for (const event of events) {
      let agentRes;

      const mainResult = await main(`
            Nombre: ${event.operator}
            Prioridad: 1
            Evento ID: ${event.eventID}
            Id de la cuenta: ${event.accountId}
            Hora de proceso del evento: ${event.createdAt}
            fecha de llegada de evento: ${event.processedAt}
            Transcripcion de la llamada: ${llamadas[0]}
            `);

      agentRes = safeParseLLMResponse(mainResult);

      let { evaluacionQA, puntuacionLlamada } = calcularPuntuaciones(agentRes);
      let eventoCompleteAndClean = {
        ...event,
        ...agentRes,
        evaluacionQA,
        puntuacionLlamada,
      };

      result.push(eventoCompleteAndClean);
    }
    
    if(result.length >= 1)  await createOperatorReports(result)

   

    return result;
  } catch (err) {
    throw err;
  }
};

export const createOperatorReports = async (
  EventEvaluated: EventEvaluated[]
) => {
  try {
    let eventosToadd: Prisma.processedEventsCreateManyInput[] = [];
    for (const e of EventEvaluated) {
      eventosToadd.push(toPrismaProcessedEvent(e));
    }
    const record = await prisma.processedEvents.createMany({
      data: eventosToadd,
    });
    return record.count;
  } catch (err) {
    throw err;
  }
};



export const filterEventsDb = async (
  data: EventoProcesadoResponseDTO[]
): Promise<EventoProcesadoResponseDTO[]> => {
  try {
    if (!data || data.length === 0) {
      return [];
    }

    const eventKeys = data
      .filter((event) => event.eventID && event.accountId)
      .map((event) => ({
        eventID: event.eventID,
        accountId: event.accountId,
      }));

    if (eventKeys.length === 0) {
      return data;
    }

    
    const EventsFoundInDb = await prisma.processedEvents.findMany({
      where: {
        OR: eventKeys.map((key) => ({
          AND: [
            { eventID: key.eventID },
            { accountId: key.accountId },
          ],
        })),
      },
      select: {
        eventID: true,
        accountId: true,
      },
    });

   
    const existingKeys = new Set(
      EventsFoundInDb.map(
        (event) => `${event.eventID}|${event.accountId}`
      )
    );

    
    const filteredEvents = data.filter((event) => {
      if (!event.eventID || !event.accountId) {
        return false;
      }
      const key = `${event.eventID}|${event.accountId}`;
      return !existingKeys.has(key);
    });

    return filteredEvents;
  } catch (err) {
    throw err;
  }
};


export const searchDatabase = async (
  event: EventoProcesado
): Promise<boolean> => {
  try {
    const recordExist = await prisma.processedEvents.findMany({
      where: {
        AND: [{ eventID: String(event.Id) }, { accountId: event.rec_iidcuenta }],
      },
    });

    return recordExist.length === 0;
  } catch (err) {
    throw err;
  }
};





export const groupEvents = (
  data: EventoProcesadoResponseDTO[],
  windowMinutes: number = 5
): EventoProcesadoResponseDTO[] => {
  const seen = new Map<string, EventoProcesadoResponseDTO[]>();

  const clean = (v: string | undefined) =>
    v ? v.replace(/\s+/g, " ").trim() : "";

  for (const event of data) {
    const clientId = clean(event.accountId);
    const code = clean(event.code);
    const status = clean(event.status);
    const zone = clean(event.zone);
    const obs = clean(event.accountObservation);

    if (!clientId || !code || !status || !zone) continue;

    const eventTime = event.createdAt;
    if (!eventTime) continue;

    const baseKey = `${clientId}|${code}|${status}|${zone}|${obs}`;

    let matched = false;

    for (const [key, group] of seen) {
      if (!key.startsWith(baseKey + "|")) continue;

      const storedTimeStr = key.split("|").pop();
      const storedTime = storedTimeStr ? new Date(storedTimeStr) : null;
      if (!storedTime) continue;

      const diff = Math.abs(differenceInMinutes(eventTime, storedTime));
      if (diff <= windowMinutes) {
        group.push(event);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const timeKey = `${baseKey}|${eventTime.toISOString()}`;
      seen.set(timeKey, [event]);
    }
  }

 
  return Array.from(seen.values()).map(group => {
    return group.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  });
};




