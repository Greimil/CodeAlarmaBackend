import type { EventEvaluated } from "@/types";

export interface ProtocolStep {
  stepNumber: number;
  description: string;
  isCritical: boolean;
}

export interface Protocol {
  code: string;
  name: string;
  steps: ProtocolStep[];
  summary: string;
}

export interface MonitoringSession {
  sessionId: string;
  event: EventEvaluated;
  protocol: Protocol | null;
  steps: ProtocolStep[];
  completedSteps: Set<number>;
  transcription: string;
  audioChunks: Buffer[];
  startTime: Date;
  lastUpdate: Date;
  websocket?: any; // WebSocket connection
}

export interface Feedback {
  type: "correction" | "notification" | "step-completed" | "protocol-status";
  message: string;
  stepNumber?: number;
  timestamp: Date;
}

export interface ProtocolStatus {
  totalSteps: number;
  completedSteps: number;
  pendingSteps: ProtocolStep[];
  missingCriticalSteps: ProtocolStep[];
  compliancePercentage: number;
}

