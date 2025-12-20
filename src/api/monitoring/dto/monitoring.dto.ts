import type { EventEvaluated } from "@/types";
import type { ProtocolStep } from "../types/monitoring.types";

export interface StartMonitoringRequestDTO {
  eventID: string;
  accountId: string;
  operator: string;
  code: string; 
  zone?: string;
  accountObservation?: string;
  createdAt?: Date;
  processedAt?: Date;
}

export interface StartMonitoringResponseDTO {
  sessionId: string;
  protocolSummary: string;
  steps: ProtocolStep[];
  websocketUrl: string;
}

export interface WebSocketMessageDTO {
  type: "audio-chunk" | "end-session" | "ping";
  data?: any;
  sessionId?: string;
}

export interface WebSocketResponseDTO {
  type: "transcription" | "feedback" | "step-completed" | "protocol-status" | "error";
  data: any;
  timestamp: string;
}

