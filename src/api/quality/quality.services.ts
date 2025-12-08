import { differenceInMinutes, format, formatDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toPrismaProcessedEvent } from "./QaAgent/mappers";
import {
  type ApiResponse,
  type EvaluacionLLM,
  type EventEvaluated,
  type EventoPendiente,
} from "@/types";
import { prisma } from "@/lib/prisma";
import { llamadas } from "./QaAgent/systemPrompt";
import { main } from "./QaAgent/QaAgent";
import type { Prisma } from "@/generated/prisma";

const URL =
  "https://codealarma.net/rest/Search/ReporteHistorico?OrdenarFecha=DESC&Estados=3&page=1&start=0&limit=100&Cuentas=0";

export const fetchEvents = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "FC02ABC7-74F2-4DDF-9A3F-D8C43A555B5B",
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
    console.error("Fetch error:", (err as Error).message);
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
    console.error("Failed to parse LLM response:", response);
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
    
    debugger
    console.log(result)
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

// export const createOperatorReport = async (EventEvaluated: EventEvaluated) => {
//   try {
//     let transforEvent = toPrismaProcessedEvent(EventEvaluated);

//     const record = await prisma.processedEvents.create({
//       data: transforEvent,
//     });

//     return record;
//   } catch (err) {
//     throw err;
//   }
// };

export const searchDatabase = async (
  event: EventoPendiente
): Promise<boolean> => {
  try {
    const recordExist = await prisma.processedEvents.findMany({
      where: {
        AND: [{ eventID: String(event.Id) }, { accountId: event.rec_iidcuenta }],
      },
    });

    return recordExist.length === 0;
  } catch (err) {
    console.error("Fetch error:", (err as Error).message);
    throw err;
  }
};
