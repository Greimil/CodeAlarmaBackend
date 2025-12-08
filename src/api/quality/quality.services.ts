import { differenceInMinutes, format, formatDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  type ApiResponse,
  type EvaluacionLLM,
  type EventEvaluated,
} from "@/types";
import { prisma } from "@/lib/prisma";
import { llamadas } from "./QaAgent/systemPrompt";
import { main } from "./QaAgent/QaAgent";

const URL =
  "https://codealarma.net/rest/Search/ReporteHistorico?OrdenarFecha=DESC&Estados=3&page=1&start=0&limit=100&Cuentas=0";

export const fetchEvents = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "5CDE6240-3B4F-4525-99FE-5733C17FDE10",
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
            Evento ID: ${event.id}
            Id de la cuenta: ${event.accountId}
            Hora de proceso del evento: ${event.createdAt}
            fecha de llegada de evento: ${event.processedAt}
            Transcripcion de la llamada: ${llamadas[0]}
            `);

      agentRes = safeParseLLMResponse(mainResult);

      let { evaluacionQA, puntuacionLlamada } = calcularPuntuaciones(agentRes);
      result.push({ ...event, ...agentRes, evaluacionQA, puntuacionLlamada });
    }

    return result;
  } catch (err) {
    throw err;
  }
};

const createOperatorReport = async (EventEvaluated: EventEvaluated[]) => {
  try {
    const record = await prisma.processedEvents.createMany({
      data: [...EventEvaluated]
    })

  
  } catch (err) {
    throw err;
  }
};

const searchDatabase = async (event: EventEvaluated): Promise<boolean> => {
  try {
    const recordExist = await prisma.processedEvents.findMany({
      where: {
        AND: [{ id: String(event.id) }, { createdAt: event.createdAt }],
      },
    });
    return recordExist.length > 0;
  } catch (err) {
    console.error("Fetch error:", (err as Error).message);
    throw err;
  }
};
