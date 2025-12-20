import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class WhisperService {
  private audioBuffer: Buffer[] = [];
  private transcriptionInterval: NodeJS.Timeout | null = null;
  private readonly CHUNK_DURATION_MS = 5000; // Transcribir cada 5 segundos
  private readonly MIN_CHUNK_SIZE = 10000; // Mínimo de bytes para transcribir (reducido para permitir chunks más pequeños)

  /**
   * Transcribe un chunk de audio acumulado
   * Para tiempo real, acumulamos chunks y transcribimos periódicamente
   */
  async transcribeChunk(audioBuffer: Buffer): Promise<string> {
    try {
      // Crear un File object para OpenAI (disponible en Node.js 18+)
      // Si File no está disponible, usar el formato compatible
      let audioFile: any;
      
      if (typeof File !== "undefined") {
        audioFile = new File([audioBuffer], "audio.webm", {
          type: "audio/webm",
        });
      } else {
        // Fallback: crear un objeto compatible
        audioFile = {
          name: "audio.webm",
          type: "audio/webm",
          stream: () => {
            const { Readable } = require("stream");
            return Readable.from([audioBuffer]);
          },
        };
      }

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "es",
        response_format: "text",
      });

      return transcription as unknown as string;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transcribe un stream completo de audio
   */
  async transcribeStream(audioStream: Buffer): Promise<string> {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:57',message:'transcribeStream entrada',data:{bufferSize:audioStream.length,firstBytes:Array.from(audioStream.slice(0,20)),hasFile:typeof File !== "undefined"},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      
      // El SDK de OpenAI en Node.js requiere un File o Blob
      // Los chunks de MediaRecorder no forman un WebM válido cuando se concatenan
      // Necesitamos detectar si el buffer tiene el header WebM válido
      const isWebMValid = audioStream.length >= 4 && 
        audioStream[0] === 0x1A && 
        audioStream[1] === 0x45 && 
        audioStream[2] === 0xDF && 
        audioStream[3] === 0xA3;
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:65',message:'Validando formato WebM',data:{isWebMValid:isWebMValid,bufferSize:audioStream.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Crear un File o Blob para OpenAI
      // El SDK de OpenAI puede procesar el buffer directamente como File/Blob
      // incluso si no es un WebM perfectamente válido, siempre que tenga el header correcto
      let audioFile: File | Blob;
      
      if (typeof File !== "undefined") {
        // Usar File con el buffer directamente
        // El SDK de OpenAI puede procesar el buffer incluso si no es un WebM perfectamente válido
        audioFile = new File([audioStream], "audio.webm", {
          type: "audio/webm",
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:78',message:'File creado',data:{fileName:audioFile.name,fileType:audioFile.type,fileSize:audioFile.size,hasWebMHeader:isWebMValid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      } else {
        // Fallback: usar Blob si File no está disponible
        audioFile = new Blob([audioStream], { type: "audio/webm" });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:85',message:'Blob usado como fallback',data:{blobType:audioFile.type,blobSize:audioFile.size,hasWebMHeader:isWebMValid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:90',message:'Antes de llamar OpenAI',data:{audioFileType:audioFile instanceof File ? audioFile.type : (audioFile as Blob).type,audioFileName:audioFile instanceof File ? audioFile.name : 'blob',hasWebMHeader:isWebMValid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // El SDK de OpenAI puede detectar el formato automáticamente
      // Intentamos con webm, y si falla, el error nos dirá qué formato usar
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile as any,
        model: "whisper-1",
        language: "es",
        response_format: "text",
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:92',message:'Transcripción exitosa',data:{transcriptionLength:transcription?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D'})}).catch(()=>{});
      // #endregion

      return transcription as unknown as string;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:97',message:'Error en transcripción',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStatus:(error as any)?.status,errorType:(error as any)?.type},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }

  /**
   * Inicia el proceso de transcripción en tiempo real
   * Acumula chunks y transcribe periódicamente
   */
  startRealtimeTranscription(
    onTranscription: (text: string) => void
  ): (chunk: Buffer) => void {
    this.audioBuffer = [];

    // Función para procesar chunks acumulados
    const processChunks = async () => {
      if (this.audioBuffer.length === 0) return;

      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:127',message:'processChunks inicio',data:{chunkCount:this.audioBuffer.length,totalSize:this.audioBuffer.reduce((sum,b)=>sum+b.length,0)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,E'})}).catch(()=>{});
        // #endregion
        
        // Encontrar el primer chunk que tiene el header WebM válido
        // En MediaRecorder, solo el primer chunk tiene el header completo
        // Los chunks siguientes son datos de audio que pertenecen al mismo WebM
        let firstValidIndex = -1;
        for (let i = 0; i < this.audioBuffer.length; i++) {
          const chunk = this.audioBuffer[i];
          if (chunk.length >= 4 && 
              chunk[0] === 0x1A && 
              chunk[1] === 0x45 && 
              chunk[2] === 0xDF && 
              chunk[3] === 0xA3) {
            firstValidIndex = i;
            break;
          }
        }
        
        // Solo procesar si encontramos un chunk válido con header WebM
        if (firstValidIndex === -1) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:155',message:'No hay chunks válidos, esperando',data:{chunkCount:this.audioBuffer.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          return; // Esperar a que llegue un chunk con header válido
        }
        
        // SOLUCIÓN: Procesar solo el primer chunk válido individualmente
        // Los chunks de MediaRecorder no forman un WebM válido cuando se concatenan
        // Solo el primer chunk tiene el header completo y es un WebM válido por sí solo
        const chunkToProcess = this.audioBuffer[firstValidIndex];
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:167',message:'Procesando chunk válido individual',data:{chunkSize:chunkToProcess.length,firstBytes:Array.from(chunkToProcess.slice(0,20)),minSize:this.MIN_CHUNK_SIZE,validChunkIndex:firstValidIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        
        if (chunkToProcess.length < this.MIN_CHUNK_SIZE) {
          // Si el chunk es muy pequeño, esperar más datos
          // Pero si es muy pequeño (menos de la mitad del mínimo), eliminarlo para evitar loops infinitos
          if (chunkToProcess.length < this.MIN_CHUNK_SIZE / 2) {
            this.audioBuffer = this.audioBuffer.slice(firstValidIndex + 1);
          }
          return;
        }

        // Transcribir solo el chunk válido individual (no concatenar con otros chunks)
        const transcription = await this.transcribeStream(chunkToProcess);
        
        if (transcription && transcription.trim()) {
          onTranscription(transcription);
        }

        // Después de transcribir, eliminar el chunk procesado
        // Los siguientes chunks sin header no se pueden usar de todas formas
        this.audioBuffer = this.audioBuffer.slice(firstValidIndex + 1);
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:165',message:'Error en processChunks',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
        // #endregion
      }
    };

    // Configurar intervalo para transcribir periódicamente
    this.transcriptionInterval = setInterval(
      processChunks,
      this.CHUNK_DURATION_MS
    );

    // Retornar función para agregar chunks
    return (chunk: Buffer) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05c8665a-d994-488d-b541-46d0e11ef9ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhisperService.ts:134',message:'Chunk recibido',data:{chunkSize:chunk.length,firstBytes:Array.from(chunk.slice(0,20)),bufferCount:this.audioBuffer.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.audioBuffer.push(chunk);
    };
  }

  /**
   * Detiene la transcripción en tiempo real
   */
  stopRealtimeTranscription(): string | null {
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }

    // Procesar cualquier chunk restante
    if (this.audioBuffer.length > 0) {
      const combinedBuffer = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];
      return combinedBuffer.toString("base64");
    }

    return null;
  }

  /**
   * Transcribe audio desde base64
   */
  async transcribeFromBase64(base64Audio: string): Promise<string> {
    try {
      const audioBuffer = Buffer.from(base64Audio, "base64");
      return await this.transcribeStream(audioBuffer);
    } catch (error) {
      throw error;
    }
  }
}

export const whisperService = new WhisperService();

