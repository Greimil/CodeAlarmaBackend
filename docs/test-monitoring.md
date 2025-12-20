# Guía de Pruebas - Agente de Feedback en Tiempo Real

## Prerrequisitos

1. **Instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
Asegúrate de tener un archivo `.env` en la raíz del proyecto con:
```
OPENAI_API_KEY=tu_api_key_aqui
```

3. **Iniciar el servidor:**
```bash
npm run dev
```

El servidor estará corriendo en `http://localhost:3000`

## Pruebas

### 1. Probar Endpoint HTTP de Inicio

**Endpoint:** `POST http://localhost:3000/api/monitoring/start`

**Body (JSON):**
```json
{
  "eventID": "EVT-001",
  "accountId": "ACC-123",
  "operator": "Juan Pérez",
  "code": "ALARMA-001",
  "zone": "Zona A",
  "accountObservation": "Cliente reporta intrusión"
}
```

**Respuesta esperada:**
```json
{
  "sessionId": "uuid-generado",
  "protocolSummary": "Protocolo: ...\n\nPasos a seguir:\n1. ...",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Verificar identidad del cliente",
      "isCritical": true
    },
    ...
  ],
  "websocketUrl": "ws://localhost:3000/ws/monitoring/{sessionId}"
}
```

**Comando cURL:**
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

### 2. Probar WebSocket

Una vez que tengas el `sessionId` del endpoint anterior:

**Conectar WebSocket:**
```
ws://localhost:3000/ws/monitoring/{sessionId}
```

**Mensajes que puedes enviar:**

1. **Chunk de audio (Buffer):** Envía directamente bytes de audio
2. **Mensaje JSON para finalizar:**
```json
{
  "type": "end-session"
}
```

3. **Ping:**
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
  "data": {
    "text": "Texto transcrito del audio"
  },
  "timestamp": "2025-12-16T..."
}
```

2. **Feedback:**
```json
{
  "type": "feedback",
  "data": {
    "message": "⚠️ Falta completar el paso 1: Verificar identidad",
    "stepNumber": 1
  },
  "timestamp": "2025-12-16T..."
}
```

3. **Paso completado:**
```json
{
  "type": "step-completed",
  "data": {
    "message": "Paso 1 completado: Verificar identidad del cliente",
    "stepNumber": 1
  },
  "timestamp": "2025-12-16T..."
}
```

4. **Estado del protocolo:**
```json
{
  "type": "protocol-status",
  "data": {
    "totalSteps": 3,
    "completedSteps": 1,
    "pendingSteps": [...],
    "missingCriticalSteps": [...],
    "compliancePercentage": 33
  },
  "timestamp": "2025-12-16T..."
}
```

## Herramientas para Probar WebSocket

### Opción 1: Usar el script de prueba incluido
```bash
npm run test:monitoring
```

### Opción 2: Usar Postman
1. Crear nueva solicitud WebSocket
2. URL: `ws://localhost:3000/ws/monitoring/{sessionId}`
3. Conectar y enviar mensajes

### Opción 3: Usar wscat (CLI)
```bash
npm install -g wscat
wscat -c ws://localhost:3000/ws/monitoring/{sessionId}
```

### Opción 4: Usar el script Node.js de prueba
Ver `test-monitoring-client.js` en este directorio.

## Notas Importantes

1. **Audio:** El sistema espera audio en formato WebM. Para pruebas, puedes usar archivos de audio de prueba.
2. **Transcripción:** Whisper procesa chunks cada 5 segundos aproximadamente.
3. **Sesiones:** Las sesiones expiran después de 30 minutos de inactividad.
4. **Protocolos:** El sistema consulta el manual de protocolos usando LangChain. Si no encuentra un protocolo específico, usa uno genérico.

