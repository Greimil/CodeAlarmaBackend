import type { ProtocolStep, Feedback } from "../types/monitoring.types";

export class ProtocolMonitor {
  private completedSteps: Set<number> = new Set();
  private steps: ProtocolStep[] = [];

  constructor(steps: ProtocolStep[]) {
    this.steps = steps;
  }

  /**
   * Marca un paso como completado
   */
  markStepCompleted(stepNumber: number): void {
    this.completedSteps.add(stepNumber);
  }

  /**
   * Verifica si un paso está completado
   */
  isStepCompleted(stepNumber: number): boolean {
    return this.completedSteps.has(stepNumber);
  }

  /**
   * Obtiene los pasos pendientes
   */
  getPendingSteps(): ProtocolStep[] {
    return this.steps.filter(
      (step) => !this.completedSteps.has(step.stepNumber)
    );
  }

  /**
   * Obtiene los pasos críticos pendientes
   */
  getPendingCriticalSteps(): ProtocolStep[] {
    return this.steps.filter(
      (step) =>
        step.isCritical && !this.completedSteps.has(step.stepNumber)
    );
  }

  /**
   * Obtiene el estado del protocolo
   */
  getProtocolStatus() {
    const totalSteps = this.steps.length;
    const completedSteps = this.completedSteps.size;
    const pendingSteps = this.getPendingSteps();
    const missingCriticalSteps = this.getPendingCriticalSteps();
    const compliancePercentage = totalSteps > 0 
      ? Math.round((completedSteps / totalSteps) * 100) 
      : 0;

    return {
      totalSteps,
      completedSteps,
      pendingSteps,
      missingCriticalSteps,
      compliancePercentage,
    };
  }

  /**
   * Analiza la transcripción y detecta pasos completados
   * Retorna feedback si detecta pasos omitidos
   */
  analyzeTranscription(transcription: string): Feedback[] {
    const feedback: Feedback[] = [];
    const transcriptionLower = transcription.toLowerCase();

    // Verificar cada paso pendiente
    const pendingSteps = this.getPendingSteps();

    for (const step of pendingSteps) {
      const stepKeywords = this.extractKeywords(step.description);
      const foundKeywords = stepKeywords.filter((keyword) =>
        transcriptionLower.includes(keyword.toLowerCase())
      );

      // Si encontramos suficientes palabras clave, el paso está completado
      if (foundKeywords.length >= Math.ceil(stepKeywords.length * 0.5)) {
        this.markStepCompleted(step.stepNumber);
        feedback.push({
          type: "step-completed",
          message: `Paso ${step.stepNumber} completado: ${step.description}`,
          stepNumber: step.stepNumber,
          timestamp: new Date(),
        });
      }
    }

    // Verificar pasos críticos faltantes
    const missingCritical = this.getPendingCriticalSteps();
    if (missingCritical.length > 0) {
      const firstMissing = missingCritical[0];
      feedback.push({
        type: "correction",
        message: `⚠️ Falta completar el paso crítico ${firstMissing.stepNumber}: ${firstMissing.description}`,
        stepNumber: firstMissing.stepNumber,
        timestamp: new Date(),
      });
    }

    return feedback;
  }

  /**
   * Extrae palabras clave de una descripción
   */
  private extractKeywords(description: string): string[] {
    // Remover palabras comunes y obtener palabras significativas
    const stopWords = new Set([
      "el",
      "la",
      "los",
      "las",
      "un",
      "una",
      "de",
      "del",
      "en",
      "con",
      "por",
      "para",
      "que",
      "es",
      "son",
      "se",
      "ha",
      "han",
    ]);

    return description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  /**
   * Resetea el monitor (útil para nuevas sesiones)
   */
  reset(): void {
    this.completedSteps.clear();
  }
}

