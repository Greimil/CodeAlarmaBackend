import { fetchEvents } from "../quality/quality.service";
import { monitoringService } from "./monitoring.service";
import type { ApiResponse, EventoProcesado } from "@/types";
import type { StartMonitoringRequestDTO } from "./dto/monitoring.dto";
import { parseISO } from "date-fns";

class PollingService {
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private processedEventIds: Set<string> = new Set();
  private readonly POLLING_INTERVAL_MS = 3000; // 30 segundos
  private readonly API_BASE_URL = "https://codealarma.net/Rest/Search/ReporteHistoricoMM";
 
  private readonly API_AUTH = "206E417B-02BD-41E3-8B11-F878A5FADF11";

  /**
   * Construye la URL de la API con parámetros dinámicos
   */
  private buildApiUrl(): string {
    const params = new URLSearchParams({
      _dc: Date.now().toString(), // Timestamp dinámico para evitar cache
      cod_nMultiMonitor: "1",
      Origenes: "",
      Estados: "1",
      Tipos: "",
      CodigosAlarma: "",
      short: "1",
      cue_clinea: "",
      Prioridad: "1",
      cue_ncuenta: "",
      Operador: "",
      OperadorNot: "",
      Mostrar: "50",
      FechaDesde: "",
      FechaHasta: "",
      cod_cgrupoExcluir: "",
      extramonth: "false",
      page: "1",
      start: "0",
      limit: "50",
      sort: JSON.stringify([{ property: "r.rec_tfechahora", direction: "DESC" }]),
    });
    return `${this.API_BASE_URL}?${params.toString()}`;
  }

  /**
   * Inicia el servicio de polling
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Ejecutar inmediatamente
    this.pollEvents();

    // Configurar intervalo
    this.pollingInterval = setInterval(() => {
      this.pollEvents();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Detiene el servicio de polling
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Consulta eventos de la API y procesa los nuevos
   */
  private async pollEvents() {
    try {
      const apiUrl = this.buildApiUrl();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:89',message:'Iniciando petición fetch',data:{url:apiUrl,headers:{'Content-Type':'application/json',Authorization:this.API_AUTH,'User-Agent':'Mozilla/5.0'}},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.API_AUTH,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json, text/plain, */*",
          Referer: "https://codealarma.net/",
          Origin: "https://codealarma.net",
        },
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:100',message:'Respuesta HTTP recibida',data:{status:response.status,statusText:response.statusText,ok:response.ok,headers:Object.fromEntries(response.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'debug-500',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion

      const responseText = await response.text();
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:112',message:'Cuerpo de respuesta leído',data:{responseText:responseText.substring(0,1000),responseLength:responseText.length,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'debug-500',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:116',message:'Error HTTP detectado - cuerpo completo',data:{status:response.status,statusText:response.statusText,responseBody:responseText,responseBodyLength:responseText.length,url:apiUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'debug-500',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
        // #endregion
        
        // Intentar extraer el mensaje de error del XML
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (responseText.includes('Invalid Token')) {
          const tokenMatch = responseText.match(/Invalid Token:\s*([A-F0-9-]+)/i);
          const invalidToken = tokenMatch ? tokenMatch[1] : this.API_AUTH;
          errorMessage = `❌ Token de autenticación inválido: ${invalidToken}. Por favor, verifica el token en la línea 13 de polling.service.ts o usa el token alternativo comentado en la línea 14.`;
        } else if (responseText.includes('<Fault')) {
          // Extraer el mensaje del XML Fault
          const reasonMatch = responseText.match(/<Reason>[\s\S]*?<Text[^>]*>([^<]+)</);
          if (reasonMatch) {
            errorMessage = `Error del servidor: ${reasonMatch[1].substring(0, 200)}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:79',message:'Respuesta completa de la API (texto)',data:{responseText,responseLength:responseText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'G'})}).catch(()=>{});
      // #endregion

      const data = JSON.parse(responseText) as ApiResponse;

      // #region agent log
      const firstRow = Array.isArray(data.rows) && data.rows.length > 0 ? data.rows[0] : null;
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:85',message:'Datos parseados de la API',data:{success:data.success,total:data.total,rowsCount:Array.isArray(data.rows)?data.rows.length:0,firstEvent:firstRow?{Id:firstRow.Id,rec_isoFechaHora:firstRow.rec_isoFechaHora,rec_tfechahora:firstRow.rec_tfechahora}:null,fullResponse:JSON.stringify(data).substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (!data.success || !Array.isArray(data.rows)) {
        return;
      }

      // Filtrar eventos nuevos (últimos 5 minutos)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:95',message:'Filtro de tiempo configurado',data:{now:now.toISOString(),fiveMinutesAgo:fiveMinutesAgo.toISOString(),totalEvents:data.rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v3',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const newEvents = data.rows.filter((evento) => {
        // Verificar que no haya sido procesado
        const eventKey = `${evento.Id}-${evento.rec_iidcuenta}`;
        if (this.processedEventIds.has(eventKey)) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:103',message:'Evento ya procesado',data:{eventKey,Id:evento.Id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          return false;
        }

        // Verificar que sea reciente (últimos 5 minutos)
        // Usar fecha de recepción o procesamiento en lugar de fecha original del evento
        // porque un evento puede ser antiguo pero haber sido recibido recientemente
        const eventDate = parseISO(
          evento.rec_isoFechaRecepcion || 
          evento.rec_isoFechaProceso || 
          evento.rec_isoFechaHora || 
          evento.rec_tfechahora
        );
        if (isNaN(eventDate.getTime())) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:109',message:'Fecha de evento inválida',data:{Id:evento.Id,rec_isoFechaRecepcion:evento.rec_isoFechaRecepcion,rec_isoFechaProceso:evento.rec_isoFechaProceso,rec_isoFechaHora:evento.rec_isoFechaHora,rec_tfechahora:evento.rec_tfechahora},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v3',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          return false;
        }

        const isRecent = eventDate >= fiveMinutesAgo;
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:120',message:'Evaluación de fecha del evento',data:{Id:evento.Id,eventDate:eventDate.toISOString(),fiveMinutesAgo:fiveMinutesAgo.toISOString(),isRecent,minutesDiff:(eventDate.getTime()-fiveMinutesAgo.getTime())/60000,usedField:evento.rec_isoFechaRecepcion?'rec_isoFechaRecepcion':evento.rec_isoFechaProceso?'rec_isoFechaProceso':'rec_isoFechaHora'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v3',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        return isRecent;
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:126',message:'Resultado del filtrado',data:{newEventsCount:newEvents.length,totalEvents:data.rows.length,processedEventsCount:this.processedEventIds.size},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v3',hypothesisId:'E,F'})}).catch(()=>{});
      // #endregion

      if (newEvents.length === 0) {
        return;
      }

      // Procesar cada evento nuevo
      for (const evento of newEvents) {
        await this.processNewEvent(evento);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.service.ts:132',message:'Error en polling',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion
    }
  }

  /**
   * Procesa un evento nuevo creando una sesión de monitoreo
   */
  private async processNewEvent(evento: EventoProcesado) {
    try {
      const eventKey = `${evento.Id}-${evento.rec_iidcuenta}`;

      // Marcar como procesado
      this.processedEventIds.add(eventKey);

      // Preparar datos para la sesión
      const eventData: StartMonitoringRequestDTO = {
        eventID: evento.Id,
        accountId: evento.rec_iidcuenta,
        operator: evento.operadorAtendiendoCuenta || evento.ope_cnombre || "Operador",
        code: evento.cod_cdescripcion || evento.rec_calarma || "ALARMA",
        zone: evento.zon_cdescripcion || evento.rec_czona || "",
        accountObservation: evento.rec_cObservaciones || evento.cue_cobservacion || "",
        createdAt: parseISO(evento.rec_isoFechaHora || evento.rec_tfechahora) || new Date(),
        processedAt: parseISO(evento.rec_isoFechaProceso || evento.rec_isoFechaRecepcion) || new Date(),
      };

      // Crear sesión de monitoreo
      const session = await monitoringService.initializeSession(eventData);

      // Limpiar eventos antiguos del cache (más de 1 hora)
      this.cleanOldEvents();
    } catch (error) {
      // Error procesando evento
    }
  }

  /**
   * Limpia eventos antiguos del cache
   */
  private cleanOldEvents() {
    // Mantener solo los últimos 1000 eventos procesados
    if (this.processedEventIds.size > 1000) {
      const entries = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(entries.slice(-1000));
    }
  }

  /**
   * Obtiene el estado del polling
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.POLLING_INTERVAL_MS,
      processedEventsCount: this.processedEventIds.size,
    };
  }
}

export const pollingService = new PollingService();

