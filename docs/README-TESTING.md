# 🧪 Guía de Pruebas - Agente de Feedback en Tiempo Real

## Inicio Rápido

### 1. Instalar Dependencias
```bash
cd backend
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:
```env
OPENAI_API_KEY=tu_api_key_de_openai
```

### 3. Iniciar el Servidor
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## Métodos de Prueba

### Método 1: Script Node.js (Recomendado)

Ejecuta el script de prueba automatizado:
```bash
npm run test:monitoring
```

Este script:
- ✅ Crea una sesión de monitoreo
- ✅ Se conecta al WebSocket
- ✅ Simula interacciones
- ✅ Muestra todos los mensajes recibidos

### Método 2: Interfaz Web HTML

1. Abre el archivo `test-monitoring-simple.html` en tu navegador
2. Completa los datos del evento
3. Haz clic en "Iniciar Sesión"
4. Conecta el WebSocket
5. Prueba enviar mensajes y ver las respuestas en tiempo real

### Método 3: cURL + wscat

**Paso 1: Crear sesión**
```bash
curl -X POST http://localhost:3000/api/monitoring/start \
  -H "Content-Type: application/json" \
  -d '{
    "eventID": "EVT-001",
    "accountId": "ACC-123",
    "operator": "Juan Pérez",
    "code": "ALARMA-001"
  }'
```

**Paso 2: Conectar WebSocket (necesitas instalar wscat)**
```bash
npm install -g wscat
wscat -c ws://localhost:3000/ws/monitoring/{sessionId}
```

### Método 4: Postman

1. **Crear sesión:**
   - Método: POST
   - URL: `http://localhost:3000/api/monitoring/start`
   - Body (JSON):
   ```json
   {
     "eventID": "EVT-001",
     "accountId": "ACC-123",
     "operator": "Juan Pérez",
     "code": "ALARMA-001"
   }
   ```

2. **Conectar WebSocket:**
   - Crear nueva solicitud WebSocket
   - URL: `ws://localhost:3000/ws/monitoring/{sessionId}`
   - Conectar y enviar mensajes

## Endpoints Disponibles

### POST `/api/monitoring/start`
Inicia una nueva sesión de monitoreo.

**Request:**
```json
{
  "eventID": "string",
  "accountId": "string",
  "operator": "string",
  "code": "string",
  "zone": "string (opcional)",
  "accountObservation": "string (opcional)"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "protocolSummary": "string",
  "steps": [
    {
      "stepNumber": 1,
      "description": "string",
      "isCritical": true
    }
  ],
  "websocketUrl": "ws://..."
}
```

### WebSocket `/ws/monitoring/:sessionId`

**Mensajes que puedes enviar:**

1. **Chunk de audio (Buffer):** Envía directamente bytes de audio
2. **JSON - Finalizar sesión:**
   ```json
   {
     "type": "end-session"
   }
   ```
3. **JSON - Ping:**
   ```json
   {
     "type": "ping"
   }
   ```

**Mensajes que recibirás:**

1. **Transcripción:**
   ```json
   {
     "type": "transcription",
     "data": { "text": "..." },
     "timestamp": "..."
   }
   ```

2. **Feedback:**
   ```json
   {
     "type": "feedback",
     "data": {
       "message": "⚠️ Falta completar el paso 1",
       "stepNumber": 1
     },
     "timestamp": "..."
   }
   ```

3. **Paso completado:**
   ```json
   {
     "type": "step-completed",
     "data": {
       "message": "Paso 1 completado",
       "stepNumber": 1
     },
     "timestamp": "..."
   }
   ```

4. **Estado del protocolo:**
   ```json
   {
     "type": "protocol-status",
     "data": {
       "totalSteps": 3,
       "completedSteps": 1,
       "compliancePercentage": 33
     },
     "timestamp": "..."
   }
   ```

## Notas Importantes

1. **Audio:** El sistema espera audio en formato WebM. Para pruebas reales, necesitas capturar audio del micrófono.

2. **Transcripción:** Whisper procesa chunks cada ~5 segundos. No es estrictamente tiempo real, pero es suficientemente rápido para feedback.

3. **Sesiones:** Las sesiones expiran después de 30 minutos de inactividad.

4. **Protocolos:** El sistema consulta el manual de protocolos usando LangChain. Si no encuentra un protocolo específico, usa uno genérico con pasos básicos.

5. **OpenAI API Key:** Asegúrate de tener una API key válida de OpenAI configurada en tu `.env`.

## Solución de Problemas

### Error: "Sesión no encontrada"
- Asegúrate de usar el `sessionId` correcto del endpoint `/start`
- Verifica que la sesión no haya expirado (30 minutos)

### Error: "OPENAI_API_KEY no configurada"
- Verifica que tengas un archivo `.env` con `OPENAI_API_KEY=tu_key`

### WebSocket no conecta
- Verifica que el servidor esté corriendo
- Asegúrate de usar `ws://` (no `http://`) para WebSocket
- Verifica que el `sessionId` sea correcto

### No se reciben transcripciones
- El sistema transcribe cada 5 segundos aproximadamente
- Asegúrate de estar enviando chunks de audio válidos
- Verifica que tu API key de OpenAI tenga créditos disponibles

