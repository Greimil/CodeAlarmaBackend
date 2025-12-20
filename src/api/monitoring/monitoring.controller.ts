import type { Request, Response } from "express";
import { monitoringService } from "./monitoring.service";
import type {
  StartMonitoringRequestDTO,
  StartMonitoringResponseDTO,
} from "./dto/monitoring.dto";

export const startMonitoringController = async (
  req: Request<{}, StartMonitoringResponseDTO, StartMonitoringRequestDTO>,
  res: Response<StartMonitoringResponseDTO>
) => {
  try {
    const eventData = req.body;

    // Validar datos requeridos
    if (!eventData.eventID || !eventData.accountId || !eventData.operator || !eventData.code) {
      return res.status(400).json({
        sessionId: "",
        protocolSummary: "",
        steps: [],
        websocketUrl: "",
      } as StartMonitoringResponseDTO);
    }

    // Inicializar sesión
    const session = await monitoringService.initializeSession(eventData);

    // Obtener resumen del protocolo
    const protocolSummary = await monitoringService.getProtocolSummary(session.sessionId);

    // Construir URL del WebSocket
    const protocol = req.protocol === "https" ? "wss" : "ws";
    const host = req.get("host") || "localhost:3000";
    const websocketUrl = `${protocol}://${host}/ws/monitoring/${session.sessionId}`;

    const response: StartMonitoringResponseDTO = {
      sessionId: session.sessionId,
      protocolSummary,
      steps: session.steps,
      websocketUrl,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      sessionId: "",
      protocolSummary: "",
      steps: [],
      websocketUrl: "",
    } as StartMonitoringResponseDTO);
  }
};

/**
 * Obtiene la sesión activa actual (si existe)
 */
export const getActiveSessionController = async (
  req: Request,
  res: Response
) => {
  try {
    const activeSession = monitoringService.getActiveSession();

    if (!activeSession) {
      return res.status(404).json({
        message: "No hay sesión activa",
      });
    }
    

    const protocol = req.protocol === "https" ? "wss" : "ws";
    const host = req.get("host") || "localhost:3000";
    const websocketUrl = `${protocol}://${host}/ws/monitoring/${activeSession.sessionId}`;

    const protocolSummary = await monitoringService.getProtocolSummary(
      activeSession.sessionId
    );

    return res.status(200).json({
      sessionId: activeSession.sessionId,
      protocolSummary,
      steps: activeSession.steps,
      websocketUrl,
      event: {
        eventID: activeSession.event.eventID,
        accountId: activeSession.event.accountId,
        operator: activeSession.event.operator,
        code: activeSession.event.code,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error al obtener sesión activa",
    });
  }
};
