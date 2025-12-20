import { v4 as uuidv4 } from "uuid";
import type { EventEvaluated } from "@/types";
import type {
  MonitoringSession,
  Protocol,
  ProtocolStep,
  Feedback,
} from "./types/monitoring.types";
import { monitoringAgent } from "./MonitoringAgent/MonitoringAgent";
import { ProtocolMonitor } from "./MonitoringAgent/ProtocolMonitor";
import type { StartMonitoringRequestDTO } from "./dto/monitoring.dto";

class MonitoringService {
  private sessions: Map<string, MonitoringSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

  /**
   * Inicializa una nueva sesión de monitoreo
   */
  async initializeSession(
    eventData: StartMonitoringRequestDTO
  ): Promise<MonitoringSession> {
    const sessionId = uuidv4();

    // Convertir a EventEvaluated
    const event: EventEvaluated = {
      eventID: eventData.eventID,
      accountId: eventData.accountId,
      operator: eventData.operator,
      code: eventData.code,
      zone: eventData.zone || "",
      accountObservation: eventData.accountObservation,
      createdAt: eventData.createdAt || new Date(),
      processedAt: eventData.processedAt || new Date(),
    };


    const protocol = await monitoringAgent.getProtocolForCode(eventData.code, eventData.accountObservation || "");
   

    const defaultProtocol: Protocol = protocol || {
      code: eventData.code,
      name: `Protocolo para código ${eventData.code}`,
      steps: [
        {
          stepNumber: 1,
          description: "Verificar identidad del cliente",
          isCritical: true,
        },
        {
          stepNumber: 2,
          description: "Confirmar la emergencia",
          isCritical: true,
        },
        {
          stepNumber: 3,
          description: "Despachar ayuda si es necesario",
          isCritical: true,
        },
      ],
      summary: "Protocolo estándar de atención",
    };

    const session: MonitoringSession = {
      sessionId,
      event,
      protocol: defaultProtocol,
      steps: defaultProtocol.steps,
      completedSteps: new Set(),
      transcription: "",
      audioChunks: [],
      startTime: new Date(),
      lastUpdate: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Configurar timeout para limpiar sesión inactiva
    setTimeout(() => {
      if (this.sessions.has(sessionId)) {
        const sess = this.sessions.get(sessionId);
        if (sess && Date.now() - sess.lastUpdate.getTime() > this.SESSION_TIMEOUT_MS) {
          this.sessions.delete(sessionId);
        }
      }
    }, this.SESSION_TIMEOUT_MS);

    return session;
  }

  /**
   * Obtiene una sesión por ID
   */
  getSession(sessionId: string): MonitoringSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Actualiza la transcripción de una sesión
   */
  async updateTranscription(
    sessionId: string,
    newText: string
  ): Promise<Feedback[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    // Actualizar transcripción
    session.transcription = newText;
    session.lastUpdate = new Date();

  

    // Analizar cumplimiento
    const feedback = await monitoringAgent.analyzeCompliance(
      newText,
      session.protocol!,
      session.completedSteps
    );



    // Actualizar pasos completados basándose en el feedback
    feedback.forEach((fb) => {
      if (fb.type === "step-completed" && fb.stepNumber) {
        session.completedSteps.add(fb.stepNumber);
      }
    });

    return feedback;
  }

  /**
   * Obtiene el resumen del protocolo para una sesión
   */
  async getProtocolSummary(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.protocol) {
      return "Protocolo no disponible";
    }

    return await monitoringAgent.generateProtocolSummary(session.protocol);
  }

  /**
   * Agrega un chunk de audio a la sesión
   */
  addAudioChunk(sessionId: string, chunk: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    session.audioChunks.push(chunk);
    session.lastUpdate = new Date();
  }

  /**
   * Registra una conexión WebSocket para una sesión
   */
  registerWebSocket(sessionId: string, ws: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    session.websocket = ws;
  }

  /**
   * Envía feedback a través del WebSocket
   */
  sendFeedback(sessionId: string, feedback: Feedback): void {

    const session = this.sessions.get(sessionId);
    if (!session || !session.websocket) {

      return;
    }

    try {
      // Los feedbacks de tipo "step-completed" se envían como mensajes separados
      if (feedback.type === "step-completed") {
        const message = JSON.stringify({
          type: "step-completed",
          data: {
            stepNumber: feedback.stepNumber,
            message: feedback.message,
          },
          timestamp: feedback.timestamp.toISOString(),
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'monitoring.service.ts:200',message:'Enviando step-completed por WebSocket',data:{sessionId,messageLength:message.length,stepNumber:feedback.stepNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        session.websocket.send(message);
      } else {
        // Otros tipos de feedback (correction, notification, protocol-status) se envían como "feedback"
        const message = JSON.stringify({
          type: "feedback", // Tipo del mensaje WebSocket siempre es "feedback"
          data: {
            type: feedback.type, // Tipo específico del feedback dentro de data
            message: feedback.message,
            stepNumber: feedback.stepNumber,
          },
          timestamp: feedback.timestamp.toISOString(),
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'monitoring.service.ts:215',message:'Enviando feedback por WebSocket',data:{sessionId,messageLength:message.length,feedbackType:feedback.type,wsMessageType:'feedback'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        session.websocket.send(message);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'monitoring.service.ts:220',message:'Error enviando feedback',data:{sessionId,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
    }
  }

  /**
   * Finaliza una sesión
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.websocket) {
      try {
        session.websocket.close();
      } catch (error) {
      }
    }
    this.sessions.delete(sessionId);
  }

  /**
   * Obtiene el estado del protocolo para una sesión
   */
  getProtocolStatus(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.protocol) {
      return null;
    }

    const monitor = new ProtocolMonitor(session.steps);
    session.completedSteps.forEach((stepNum) => {
      monitor.markStepCompleted(stepNum);
    });

    return monitor.getProtocolStatus();
  }

  /**
   * Obtiene la sesión activa más reciente (última creada)
   */
  getActiveSession(): MonitoringSession | null {
    if (this.sessions.size === 0) {
      return null;
    }

    // Retornar la sesión más reciente
    let latestSession: MonitoringSession | null = null;
    let latestTime = 0;

    for (const session of this.sessions.values()) {
      if (session.startTime.getTime() > latestTime) {
        latestTime = session.startTime.getTime();
        latestSession = session;
      }
    }

    return latestSession;
  }
}

export const monitoringService = new MonitoringService();

