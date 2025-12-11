import { Prisma } from "@/generated/prisma";

export interface ApiResponse {
  success: boolean;
  total: number;
  rows: EventoProcesado[];
}

export interface EventoProcesado {
  Id: string;
  rec_cCategorizacion: string;
  rec_cObservaciones: string;
  rec_cContenido: string;
  rec_calarma: string;
  rec_czona: string;
  rec_idResolucion: string;
  rec_iid: string;
  rec_iidcuenta: string;
  rec_ioperador: string;
  rec_iusuario: string;
  rec_iPuerto: string;
  rec_nOrigen: string;
  rec_nestado: string;
  rec_tFechaProceso: string;
  rec_tFechaRecepcion: string;
  rec_tfechahora: string;
  rec_iPrioridad: string;
  rec_isoFechaHora: string;
  rec_isoFechaProceso: string;
  rec_isoFechaRecepcion: string;
  rec_spanishFechaHora: string;
  rec_spanishFechaProceso: string;
  rec_spanishchaRecepcion: string;
  _origen: string;
  _puerto: string;
  rec_cTerminal: string;
  rec_iMinutosEspera: string;
  rec_iNYR: string;
  rec_iTE: string;
  rec_idFwd: string;
  rec_idLoc: string;
  rec_idMap: string;
  usr_cnombre: string;
  rec_idReceptor: string;
  tiene_notificaciones: string;
  zonas_ccodigo: string;
  zonas_cdescripcion: string;
  tablaDatos: string;
  cod_cdescripcion: string;
  cod_ncolor: string;
  cod_ncolorletra: string;
  cod_nWebCliente: string;
  cod_nMultiMonitor: string;
  cue_iid: string;
  cue_clinea: string;
  cue_ncuenta: string;
  cue_cnombre: string;
  cue_ccalle: string;
  cue_cubicacion: string;
  cue_clatlng: string;
  cue_clocalidad: string;
  cue_cprovincia: string;
  cue_ctelefono: string;
  cue_cIdExtendido: string;
  tip_nTipo: string;
  ope_cnombre: string;
  pro_cdescripcion: string;
  gps_idRec: string;
  gps_idCuenta: string;
  gps_cimei: string;
  gps_rLatitud: string;
  gps_cDireccion: string;
  gps_rLongitud: string;
  gps_rAccuracy: string;
  gps_cMethod: string;
  gps_tRawfechahora: string;
  rxt_nSPIP: string;
  rxt_nSPSMS: string;
  rxt_nVCIP: string;
  rxt_nVCSMS: string;
  gps_cimei1: string;
  rxl_clinecard: string;
  rxl_cLog: string;
  cue_nparticion: string;
  cue_cclave: string;
  cue_cpermiso: string;
  madre_clinea: string;
  madre_ncuenta: string;
  madre_cnombre: string;
  res_cdescripcion: string;
  cat_cDescripcion: string;
  _tfechahoraOffset: string;
  cod_nprioridad: string;
  cod_ntipo: string;
  cod_nalerta: string;
  cue_cobservacion: string;
  cue_ccustom: string;
  operadorAtendiendoCuenta: string;
  zon_cAlarmaAGenerar: string;
  zon_ccodigorestauracion: string;
  zon_ccuenta: string;
  zon_cdealer: string;
  zon_cimagen: string;
  zon_clistaemergencia: string;
  zon_codigoalarma: string;
  zon_idKey: string;
  zon_iidcuenta: string;
  zon_mobservacion: string;
  zon_nautoprocesa: string;
  zon_nminutosrestauracion: string;
  zon_nmostrar: string;
  zon_cdescripcion: string;
  ope_clogin: string;
  cod_nLeeSonido: string;
  cod_cSonido: string;
  cod_cGrupo: string;
  rec_cdescripcion: string;
  rec_cdll: string;
  rec_ntcpip: string;
  sta_ncontadorfa: string;
  fal_nmargen: string;
  ttz_noffset: string;
  aut_ccodigo: string;
  aut_cnombre: string;
  aut_meventos: string;
  aut_cdealer: string;
  aut_meventosauto: string;
  aut_cprovincia: string;
  aut_cAutoProcesados: string;
  aut_iDestino: string;
  aut_idKey: string;
  zon_ccodigo: string;
  _zon_cdescripcion: string;
  Usuario_cnombre: string;
  est_nestado: string;
  usu_cIdExtendido: string;
  rxi_cTipo: string;
}



export interface EventEvaluated {
  eventID: string;
  createdAt: Date;
  processedAt: Date;
  operator?: string;
  operatorNotes?: string;
  accountId: string;
  code: string; 
  accountObservation?: string;
  evaluacionLlamada?: string;
  cumplimientoProtocolo?: "Cumple protocolo" | "Cumplimiento parcial" | "Incumple protocolo";
  esFaltaRecurrente?: boolean;
  cumpleSLA?: boolean; 
  puntuacionLlamada?: number; 
  evaluacionQA?: number; 
  accionRecomendada?: "Ninguna" | "Capacitación" | "Amonestación verbal" | "Amonestación escrita" | "Investigación";
  status?: string
  zone: string
  slaTimeInMiliSeconds?: number
}


export interface EvaluacionLLM {
  cumpleSLA: boolean,
  cumplimientoProtocolo: "Cumple protocolo" | "Incumple protocolo" | "Cumplimiento parcial",
  esFaltaRecurrente: boolean
}

// Prisma Interfaces



// Usa el tipo generado por Prisma
type ProcessedEventInput = Prisma.processedEventsCreateManyInput;

type Input = Prisma.processedEventsCreateManyInput[];

// Para create
type SingleInput = Prisma.processedEventsCreateInput;

