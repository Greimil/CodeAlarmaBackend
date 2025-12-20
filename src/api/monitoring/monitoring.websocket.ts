import type { Application } from "express-ws";
import { monitoringService } from "./monitoring.service";
import { whisperService } from "./WhisperService/WhisperService";
import type { WebSocketMessageDTO, WebSocketResponseDTO } from "./dto/monitoring.dto";

export function setupMonitoringWebSocket(app: Application) {
  app.ws("/ws/monitoring/:sessionId", (ws, req) => {
    const sessionId = req.params.sessionId;

    // Validar que la sesión existe
    const session = monitoringService.getSession(sessionId);
    if (!session) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Sesión no encontrada" },
          timestamp: new Date().toISOString(),
        } as WebSocketResponseDTO)
      );
      ws.close();
      return;
    }

    // Registrar WebSocket en la sesión
    monitoringService.registerWebSocket(sessionId, ws);

    // Configurar transcripción en tiempo real
    let addAudioChunk: ((chunk: Buffer) => void) | null = null;

    const handleTranscription = async (transcription: string) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'monitoring.websocket.ts:30',message:'handleTranscription llamado',data:{sessionId,transcriptionLength:transcription.length,transcriptionPreview:transcription.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      try {
        // Actualizar transcripción en la sesión
        const feedback = await monitoringService.updateTranscription(
          sessionId,
          transcription
        );

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'monitoring.websocket.ts:37',message:'updateTranscription retornó',data:{feedbackCount:feedback.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        // Enviar transcripción actualizada
        ws.send(
          JSON.stringify({
            type: "transcription",
            data: { text: transcription },
            timestamp: new Date().toISOString(),
          } as WebSocketResponseDTO)
        );

        // Enviar feedback si hay
        feedback.forEach((fb) => {
          monitoringService.sendFeedback(sessionId, fb);
        });

        // Enviar estado del protocolo
        const protocolStatus = monitoringService.getProtocolStatus(sessionId);
        if (protocolStatus) {
          ws.send(
            JSON.stringify({
              type: "protocol-status",
              data: protocolStatus,
              timestamp: new Date().toISOString(),
            } as WebSocketResponseDTO)
          );
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Error procesando transcripción" },
            timestamp: new Date().toISOString(),
          } as WebSocketResponseDTO)
        );
      }
    };

    // Iniciar transcripción en tiempo real
    addAudioChunk = whisperService.startRealtimeTranscription(handleTranscription);

    // Manejar mensajes del cliente
    ws.on("message", async (message: Buffer | string) => {
      try {
        // Si el mensaje es texto, intentar parsearlo como JSON
        if (typeof message === "string") {
          const parsed: WebSocketMessageDTO = JSON.parse(message);

          switch (parsed.type) {
            case "end-session":
              // Finalizar sesión
              if (addAudioChunk) {
                whisperService.stopRealtimeTranscription();
              }
              monitoringService.endSession(sessionId);
              ws.close();
              break;

            case "ping":
              // Responder ping
              ws.send(
                JSON.stringify({
                  type: "pong",
                  data: {},
                  timestamp: new Date().toISOString(),
                } as WebSocketResponseDTO)
              );
              break;

            default:
              break;
          }
        } else {
          // El mensaje es un buffer (chunk de audio)
          const audioBuffer = Buffer.from(message);

          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'monitoring.websocket.ts:110',message:'Chunk recibido en WebSocket',data:{bufferSize:audioBuffer.length,firstBytes:Array.from(audioBuffer.slice(0,20))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,E'})}).catch(()=>{});
          // #endregion

          // Agregar chunk a la sesión
          monitoringService.addAudioChunk(sessionId, audioBuffer);

          // Procesar con Whisper
          if (addAudioChunk) {
            addAudioChunk(audioBuffer);
          }
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Error procesando mensaje" },
            timestamp: new Date().toISOString(),
          } as WebSocketResponseDTO)
        );
      }
    });

    // Manejar cierre de conexión
    ws.on("close", () => {
      if (addAudioChunk) {
        whisperService.stopRealtimeTranscription();
      }
    });

    // Manejar errores
    ws.on("error", (error) => {
      if (addAudioChunk) {
        whisperService.stopRealtimeTranscription();
      }
    });

    // Enviar mensaje de confirmación de conexión
    ws.send(
      JSON.stringify({
        type: "protocol-status",
        data: {
          message: "Conexión establecida. Enviando audio...",
          sessionId,
        },
        timestamp: new Date().toISOString(),
      } as WebSocketResponseDTO)
    );
  });
}

