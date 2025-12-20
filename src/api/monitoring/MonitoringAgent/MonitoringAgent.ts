import { createAgent, HumanMessage } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { monitoringSystemPrompt, protocolSearchSystemPrompt } from "./systemPrompt";
import { searchPDF, checkStepCompletion } from "./tools";
import type { EventEvaluated } from "@/types";
import type {
  Protocol,
  ProtocolStep,
  MonitoringSession,
  Feedback,
} from "../types/monitoring.types";
import { ProtocolMonitor } from "./ProtocolMonitor";

export class MonitoringAgent {
  private model: ChatOpenAI;
  private agent: any;
  private protocolSearchAgent: any;

  constructor() {
    this.model = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    // Agente para análisis de cumplimiento
    this.agent = createAgent({
      model: this.model,
      tools: [searchPDF, checkStepCompletion],
      systemPrompt: monitoringSystemPrompt,
    });

    // Agente separado para búsqueda de protocolos
    this.protocolSearchAgent = createAgent({
      model: this.model,
      tools: [searchPDF],
      systemPrompt: protocolSearchSystemPrompt,
    });
  }

  /**
   * Consulta el protocolo para un código de alarma específico
   */
  async getProtocolForCode(code: string, accountObservation?: string): Promise<Protocol | null> {

    try {
      const prompt = `IMPORTANTE: Necesito que busques y devuelvas los pasos del protocolo SIN DUPLICADOS.

INSTRUCCIONES:
1. Busca el protocolo general para el código de alarma: ${code} usando la herramienta buscar_manual
2. ${accountObservation ? `Busca también los pasos específicos de la observación de la cuenta: "${accountObservation}"` : ''}
3. COMBINA ambos protocolos eliminando duplicados:
   - Si un paso específico de cuenta es MÁS ESPECÍFICO que un paso general sobre el mismo tema, REEMPLAZA el general con el específico
   - NO incluyas pasos duplicados o redundantes
   - Solo incluye pasos del protocolo general que NO estén cubiertos por pasos más específicos de la cuenta
4. Devuelve los pasos en formato de lista numerada, uno por línea

EJEMPLO: Si el protocolo general dice "Llamar siguiendo orden de prioridades" y la cuenta específica dice "Llamar al Sr. Ramirez", SOLO incluye "Llamar al Sr. Ramirez" (el específico reemplaza al general).

FORMATO DE RESPUESTA ESPERADO:
1. [Descripción del paso 1]
2. [Descripción del paso 2]
3. [Descripción del paso 3]
...

NO devuelvas mensajes de corrección ni feedback. Solo devuelve la lista de pasos numerados SIN duplicados que el operador debe seguir.`;

  

      // Usar el agente específico para búsqueda de protocolos
      const result = await this.protocolSearchAgent.invoke({
        messages: [new HumanMessage(prompt)],
      });

  

      const lastMessage = result.messages.at(-1);
      const content = lastMessage?.content;

  

      if (!content) {
        return null;
      }

      const contentStr =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content
                .map((block) =>
                  typeof block === "string" ? block : block.text ?? ""
                )
                .join("")
            : "";



      
      const protocol = this.parseProtocolFromResponse(contentStr, code);
      

      
      return protocol;
    } catch (error) {
      return null;
    }
  }

  /**
   * Genera un resumen de pasos del protocolo
   */
  async generateProtocolSummary(protocol: Protocol): Promise<string> {
    try {
      const stepsList = protocol.steps
        .map(
          (step, idx) =>
            `${idx + 1}. ${step.description}${step.isCritical ? " [CRÍTICO]" : ""}`
        )
        .join("\n");

      return `Protocolo: ${protocol.name}\n\nPasos a seguir:\n${stepsList}`;
    } catch (error) {
      return protocol.summary || "Protocolo no disponible";
    }
  }

  /**
   * Analiza el cumplimiento del protocolo basándose en la transcripción
   */
  async analyzeCompliance(
    transcription: string,
    protocol: Protocol,
    completedSteps: Set<number>
  ): Promise<Feedback[]> {
 
    try {
      const pendingSteps = protocol.steps.filter(
        (step) => !completedSteps.has(step.stepNumber)
      );

    
      if (pendingSteps.length === 0) {
        return [
          {
            type: "protocol-status",
            message: "Todos los pasos del protocolo han sido completados",
            timestamp: new Date(),
          },
        ];
      }

      // Identificar pasos condicionales y marcarlos
      const stepsList = pendingSteps
        .map((step) => {
          const isConditional = this.isConditionalStep(step.description);
          const conditionalMark = isConditional ? " [CONDICIONAL - solo aplica si se cumple la condición]" : "";
          return `Paso ${step.stepNumber}${step.isCritical ? " [CRÍTICO]" : ""}${conditionalMark}: ${step.description}`;
        })
        .join("\n");

      const prompt = `Analiza la siguiente transcripción de una llamada y compara con los pasos pendientes del protocolo.

TRANSCRIPCIÓN:
${transcription}

PASOS PENDIENTES:
${stepsList}

INSTRUCCIONES DE ANÁLISIS:
1. Identifica qué pasos fueron completados explícitamente en la transcripción
2. Para pasos marcados como [CONDICIONAL], verifica si la condición se cumplió:
   - Si el paso dice "Realizar 2 intentos" pero el operador contactó en el primer intento → NO es faltante (el objetivo ya se cumplió)
   - Si el paso dice "Si no hay respuesta, enviar patrulla" pero hubo respuesta → NO es faltante (la condición no se cumplió)
   - Si el paso dice "Si [condición]" pero la condición NO se cumplió → NO es faltante
3. Solo marca como faltantes pasos que:
   - Son obligatorios (sin [CONDICIONAL]) y no se completaron
   - Son condicionales cuya condición SÍ se cumplió pero no se ejecutó la acción

IMPORTANTE: Analiza el contexto completo de la transcripción. Si un paso condicional ya no aplica porque su condición no se cumplió o el objetivo ya se alcanzó, NO lo marques como faltante.

Responde en formato JSON con el siguiente formato:
{
  "completedSteps": [números de pasos completados],
  "missingSteps": [números de pasos faltantes que realmente aplican],
  "feedback": ["mensaje 1", "mensaje 2"]
}`;



      const result = await this.agent.invoke({
        messages: [new HumanMessage(prompt)],
      });



      const lastMessage = result.messages.at(-1);
      const content = lastMessage?.content;


      if (!content) {

        return [];
      }

      const contentStr =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content
                .map((block) =>
                  typeof block === "string" ? block : block.text ?? ""
                )
                .join("")
            : "";

   

      const feedback = this.parseFeedbackFromResponse(contentStr, protocol);
      
    
      
      return feedback;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parsea el protocolo desde la respuesta del agente
   */
  private parseProtocolFromResponse(
    response: string,
    code: string
  ): Protocol {
    // Filtrar mensajes de feedback/corrección que no son pasos del protocolo
    // El agente a veces devuelve mensajes como "Falta completar el paso X" que no son pasos reales
    const feedbackPatterns = [
      /falta completar/i,
      /asegúrate de seguir/i,
      /debe seguir el orden/i,
      /paso \d+ completado/i,
      /correction/i,
      /feedback/i,
    ];

    const steps: ProtocolStep[] = [];
    const lines = response.split("\n");

    let stepNumber = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Saltar líneas vacías o que sean mensajes de feedback
      if (!trimmed || feedbackPatterns.some(pattern => pattern.test(trimmed))) {
        continue;
      }

      // Buscar líneas que parezcan pasos numerados
      const stepMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (stepMatch && stepMatch[2]) {
        const description = stepMatch[2];
        const cleanDescription = description.trim();
        
        if (cleanDescription.length > 10 && !feedbackPatterns.some(pattern => pattern.test(cleanDescription))) {
          const isCritical =
            cleanDescription.toLowerCase().includes("crítico") ||
            cleanDescription.toLowerCase().includes("obligatorio") ||
            cleanDescription.toLowerCase().includes("importante") ||
            cleanDescription.toLowerCase().includes("prioritario");

          steps.push({
            stepNumber: stepNumber++,
            description: cleanDescription,
            isCritical,
          });
        }
        continue;
      }

      // También aceptar formato con guiones o asteriscos si tienen contenido sustancial
      if ((trimmed.match(/^[-*]\s+/) || trimmed.toLowerCase().includes("paso")) && 
          trimmed.length > 20 && 
          !feedbackPatterns.some(pattern => pattern.test(trimmed))) {
        const description = trimmed
          .replace(/^[-*]\s*/, "")
          .replace(/^paso\s+\d+[:\-]?\s*/i, "")
          .trim();

        if (description.length > 10) {
          const isCritical =
            description.toLowerCase().includes("crítico") ||
            description.toLowerCase().includes("obligatorio") ||
            description.toLowerCase().includes("importante");

          steps.push({
            stepNumber: stepNumber++,
            description,
            isCritical,
          });
        }
      }
    }

    // Eliminar duplicados: si un paso es más específico que otro sobre el mismo tema, mantener solo el más específico
    const deduplicatedSteps = this.deduplicateSteps(steps);

    // Si no se encontraron pasos, crear uno genérico
    if (deduplicatedSteps.length === 0) {
      deduplicatedSteps.push({
        stepNumber: 1,
        description: `Seguir protocolo para código ${code}`,
        isCritical: true,
      });
    }

    // Renumerar los pasos después de la deduplicación
    const finalSteps = deduplicatedSteps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));

    return {
      code,
      name: `Protocolo para código ${code}`,
      steps: finalSteps,
      summary: response.substring(0, 500), // Primeros 500 caracteres como resumen
    };
  }

  /**
   * Determina si un paso es condicional (solo aplica bajo ciertas condiciones)
   */
  private isConditionalStep(description: string): boolean {
    const descLower = description.toLowerCase();
    
    // Patrones que indican pasos condicionales
    const conditionalPatterns = [
      /^si\s+/i,                    // Empieza con "Si"
      /si no hay/i,                 // "Si no hay"
      /si no se/i,                   // "Si no se"
      /si no contesta/i,             // "Si no contesta"
      /si no responde/i,             // "Si no responde"
      /realizar\s+\d+\s+intentos/i,  // "Realizar X intentos"
      /hacer\s+\d+\s+intentos/i,     // "Hacer X intentos"
      /en caso de que/i,             // "En caso de que"
      /cuando no/i,                   // "Cuando no"
      /si [a-záéíóúñ]+ no/i,         // "Si [algo] no"
    ];

    return conditionalPatterns.some(pattern => pattern.test(descLower));
  }

  /**
   * Elimina pasos duplicados o redundantes, priorizando los más específicos
   */
  private deduplicateSteps(steps: ProtocolStep[]): ProtocolStep[] {
    const deduplicated: ProtocolStep[] = [];
    const seenTopics = new Set<string>();

    // Palabras clave comunes que indican temas similares
    const topicKeywords: { [key: string]: string[] } = {
      llamar: ['llamar', 'contactar', 'notificar', 'comunicar', 'avisar'],
      verificar: ['verificar', 'confirmar', 'validar', 'comprobar'],
      despachar: ['despachar', 'enviar', 'solicitar', 'activar'],
    };

    for (const step of steps) {
      const descLower = step.description.toLowerCase();
      let isDuplicate = false;
      let isMoreSpecific = false;
      let duplicateIndex = -1;

      // Verificar si este paso es similar a uno ya incluido
      for (let i = 0; i < deduplicated.length; i++) {
        const existingStep = deduplicated[i];
        if (!existingStep) continue;
        
        const existingDescLower = existingStep.description.toLowerCase();

        // Detectar si son sobre el mismo tema
        const sameTopic = this.areStepsAboutSameTopic(descLower, existingDescLower);

        if (sameTopic) {
          // Determinar cuál es más específico (más largo, menciona nombres específicos, etc.)
          const thisSpecificity = this.calculateSpecificity(step.description);
          const existingSpecificity = this.calculateSpecificity(existingStep.description);

          if (thisSpecificity > existingSpecificity) {
            // Este paso es más específico, reemplazar el existente
            isMoreSpecific = true;
            duplicateIndex = i;
            break;
          } else {
            // El existente es más específico o igual, saltar este paso
            isDuplicate = true;
            break;
          }
        }
      }

      if (isMoreSpecific && duplicateIndex >= 0) {
        // Reemplazar el paso menos específico
        deduplicated[duplicateIndex] = step;
      } else if (!isDuplicate) {
        // Agregar el paso si no es duplicado
        deduplicated.push(step);
      }
    }

    return deduplicated;
  }

  /**
   * Determina si dos pasos son sobre el mismo tema
   */
  private areStepsAboutSameTopic(desc1: string, desc2: string): boolean {
    // Palabras clave que indican el mismo tema
    const llamarKeywords = ['llamar', 'contactar', 'notificar', 'comunicar', 'avisar'];
    const verificarKeywords = ['verificar', 'confirmar', 'validar', 'comprobar'];
    const despacharKeywords = ['despachar', 'enviar', 'solicitar', 'activar'];

    const hasLlamar1 = llamarKeywords.some(kw => desc1.includes(kw));
    const hasLlamar2 = llamarKeywords.some(kw => desc2.includes(kw));
    if (hasLlamar1 && hasLlamar2) return true;

    const hasVerificar1 = verificarKeywords.some(kw => desc1.includes(kw));
    const hasVerificar2 = verificarKeywords.some(kw => desc2.includes(kw));
    if (hasVerificar1 && hasVerificar2) return true;

    const hasDespachar1 = despacharKeywords.some(kw => desc1.includes(kw));
    const hasDespachar2 = despacharKeywords.some(kw => desc2.includes(kw));
    if (hasDespachar1 && hasDespachar2) return true;

    return false;
  }

  /**
   * Calcula qué tan específico es un paso (mayor número = más específico)
   */
  private calculateSpecificity(description: string): number {
    let score = 0;
    const descLower = description.toLowerCase();

    // Más puntos por tener nombres propios (mayúsculas seguidas de minúsculas)
    const properNames = descLower.match(/\b(sr|sra|dr|dra|ing|lic)\s+[a-záéíóúñ]+/g);
    if (properNames) score += properNames.length * 10;

    // Más puntos por ser más largo (más detallado)
    score += description.length / 10;

    // Más puntos por tener palabras específicas
    if (descLower.includes('siempre')) score += 5;
    if (descLower.includes('nunca')) score += 5;
    if (descLower.includes('específico')) score += 3;
    if (descLower.includes('particular')) score += 3;

    // Menos puntos por ser genérico
    if (descLower.includes('general')) score -= 5;
    if (descLower.includes('orden de prioridades')) score -= 3;
    if (descLower.includes('personas autorizadas')) score -= 3;

    return score;
  }

  /**
   * Parsea feedback desde la respuesta del agente
   */
  private parseFeedbackFromResponse(
    response: string,
    protocol: Protocol
  ): Feedback[] {
    const feedback: Feedback[] = [];

    try {
      // Intentar parsear JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.completedSteps) {
          parsed.completedSteps.forEach((stepNum: number) => {
            feedback.push({
              type: "step-completed",
              message: `Paso ${stepNum} completado`,
              stepNumber: stepNum,
              timestamp: new Date(),
            });
          });
        }
        if (parsed.missingSteps) {
          parsed.missingSteps.forEach((stepNum: number) => {
            const step = protocol.steps.find((s) => s.stepNumber === stepNum);
            feedback.push({
              type: "correction",
              message: `⚠️ Falta completar el paso ${stepNum}: ${step?.description || "Paso pendiente"}`,
              stepNumber: stepNum,
              timestamp: new Date(),
            });
          });
        }
        if (parsed.feedback) {
          parsed.feedback.forEach((msg: string) => {
            feedback.push({
              type: "notification",
              message: msg,
              timestamp: new Date(),
            });
          });
        }
      }
    } catch (error) {
      // Si falla el parseo JSON, crear feedback genérico
      feedback.push({
        type: "notification",
        message: "Análisis en curso...",
        timestamp: new Date(),
      });
    }

    return feedback;
  }
}

export const monitoringAgent = new MonitoringAgent();

