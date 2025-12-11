import { differenceInMinutes, format, formatDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toPrismaProcessedEvent } from "./QaAgent/mappers";
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
    console.error("Fetch error:", (err as Error).message);
    throw err;
  }
};


export const groupEvents = (
 data: Partial<EventoProcesado>[],
 windowMinutes: number = 5
): EventoProcesado[] => {
 const seen = new Map<string, EventoProcesado[]>();


 // Función de limpieza auxiliar para eliminar cualquier espacio innecesario, incluyendo
 // retornos de carro internos o espacios finales de la base de datos.
 const cleanString = (value: string | undefined): string => {
   if (value === undefined || value === null) return "";
   // 1. Reemplaza cualquier carácter no visible (como \r, \t, etc.) dentro de la cadena con un espacio simple.
   // 2. Luego usa trim() para eliminar espacios/retornos de carro al inicio/final.
   // 3. Normaliza espacios múltiples a un solo espacio.
   return value.replace(/\s+/g, " ").trim();
 };


 for (const event of data) {
   // 1. CORRECCIÓN Y LIMPIEZA del CLIENT ID


   const rawClientId = event.cue_ncuenta ?? event.rec_iid;
   const clientId = cleanString(rawClientId); // Limpiar espacios finales/iniciales (como en "0001      ")
   if (!clientId) continue;


   // 2. LIMPIEZA de otros atributos clave
   const rawEventType = event.rec_calarma ?? event.cod_cdescripcion;
   const eventType = cleanString(rawEventType);
   if (!eventType) continue;


   const eventStatus = cleanString(
     event.rec_nestado ?? event.rec_idResolucion
   );
   if (!eventStatus) continue; // Usamos cleanString para normalizar el estado


   const rawZona = event.rec_czona ?? event.zonas_ccodigo;
   const zona = cleanString(rawZona);
   if (!zona) continue;


   // Aunque observaciones usa .trim() originalmente, la nueva función cleanString es más robusta
   const rawObservaciones = event.rec_cObservaciones;
   const observaciones = cleanString(rawObservaciones);


   // Clave base (debe ser idéntica si los datos son iguales)
   const baseKey = `${clientId}|${eventType}|${eventStatus}|${zona}|${observaciones}`;


   console.log("--- Evento ---");
   console.log(`ID: ${event.Id}`);
   console.log(`Cliente (C/L): ${event.cue_ncuenta ?? event.rec_iid}`);
   console.log(`BaseKey calculada: "${baseKey}"`);
   console.log("----------------");


   // ... (El resto del código de tiempo y agrupación permanece igual) ...


   const eventTime = parseISODate(event.rec_isoFechaRecepcion!);
   if (!eventTime) continue;


   let matched = false;


   // Buscar si hay un grupo existente dentro de la ventana
   for (const [key, events] of seen) {
     if (!key.startsWith(baseKey + "|")) continue;


     // La clave lleva varios "|" (parte fija + timestamp); tomamos el último segmento como fecha.
     const storedTimeStr = key.split("|").pop();
     const storedTime = storedTimeStr ? new Date(storedTimeStr) : null;
     if (!storedTime || isNaN(storedTime.getTime())) continue;
     const diffMinutes = Math.abs(differenceInMinutes(eventTime, storedTime));


     if (diffMinutes <= windowMinutes) {
       events.push(event as EventoProcesado);
       matched = true;
       break;
     }
   }


   // Si no hay grupo en la ventana → crear uno nuevo
   if (!matched) {
     const timeKey = `${baseKey}|${eventTime.toISOString()}`;
     seen.set(timeKey, [event as EventoProcesado]);
   }
 }


 // Devolver solo un evento por grupo (el más reciente)
 let deduplicados = Array.from(seen.values()).map((group) => {
   return group.sort((a, b) => {
     const ta = parseISODate(a.rec_isoFechaRecepcion)!.getTime();
     const tb = parseISODate(b.rec_isoFechaRecepcion)!.getTime();
     return tb - ta; // más reciente primero
   })[0];
 });


 return deduplicados;
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

