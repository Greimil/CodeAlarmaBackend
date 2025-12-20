# Guía de Pruebas con Postman - Agente de Monitoreo

## Prerrequisitos

1. **Postman instalado** (versión 8.0 o superior para soporte de WebSocket)
2. **Servidor backend corriendo** en `http://localhost:3000`
3. **Variables de entorno configuradas** en el archivo `.env`

## Configuración Inicial en Postman

### 1. Crear una Nueva Colección

1. Abre Postman
2. Clic en "New" → "Collection"
3. Nombra la colección: "Agente de Monitoreo"
4. Clic en "Variables" y agrega:
   - `base_url`: `http://localhost:3000`
   - `session_id`: (se llenará automáticamente después del primer request)

### 2. Configurar Variables de Entorno (Opcional)

Crea un Environment llamado "Local Development" con:
- `base_url`: `http://localhost:3000`
- `session_id`: (vacío inicialmente)

---

## Endpoints HTTP

### 1. Iniciar Monitoreo

**Método:** `POST`  
**URL:** `{{base_url}}/api/monitoring/start`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
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

**Campos requeridos:**
- `eventID` (string)
- `accountId` (string)
- `operator` (string)
- `code` (string)

**Campos opcionales:**
- `zone` (string)
- `accountObservation` (string)

**Respuesta exitosa (200):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "protocolSummary": "Protocolo: Manejo de Alarma de Intrusión\n\nPasos a seguir:\n1. Verificar identidad del cliente...",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Verificar identidad del cliente",
      "isCritical": true
    },
    {
      "stepNumber": 2,
      "description": "Confirmar ubicación de la alarma",
      "isCritical": true
    }
  ],
  "websocketUrl": "ws://localhost:3000/ws/monitoring/550e8400-e29b-41d4-a716-446655440000"
}
```

**Script de Postman (Tests tab) para guardar sessionId:**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("session_id", response.sessionId);
    pm.collectionVariables.set("session_id", response.sessionId);
    console.log("Session ID guardado:", response.sessionId);
}
```

**Errores posibles:**
- `400`: Datos requeridos faltantes
- `500`: Error interno del servidor

---

### 2. Obtener Sesión Activa

**Método:** `GET`  
**URL:** `{{base_url}}/api/monitoring/active`

**Headers:** (ninguno requerido)

**Respuesta exitosa (200):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "protocolSummary": "Protocolo: ...",
  "steps": [...],
  "websocketUrl": "ws://localhost:3000/ws/monitoring/550e8400-e29b-41d4-a716-446655440000",
  "event": {
    "eventID": "EVT-001",
    "accountId": "ACC-123",
    "operator": "Juan Pérez",
    "code": "ALARMA-001"
  }
}
```

**Errores posibles:**
- `404`: No hay sesión activa
- `500`: Error interno del servidor

---

## WebSocket (Postman 8.0+)

### Conectar al WebSocket

1. En Postman, clic en "New" → "WebSocket Request"
2. **URL:** `ws://localhost:3000/ws/monitoring/{{session_id}}`
   - Reemplaza `{{session_id}}` con el ID obtenido del endpoint `/start`
   - O usa la variable: `ws://localhost:3000/ws/monitoring/{{session_id}}`

3. Clic en "Connect"

### Mensajes que Puedes Enviar

#### 1. Ping (para mantener conexión activa)
```json
{
  "type": "ping"
}
```

#### 2. Finalizar Sesión
```json
{
  "type": "end-session"
}
```

#### 3. Audio Chunk (formato binario)
- **Nota:** Postman tiene limitaciones para enviar audio binario directamente
- Para pruebas de audio, considera usar herramientas especializadas o scripts Node.js

### Mensajes que Recibirás

#### 1. Transcripción
```json
{
  "type": "transcription",
  "data": {
    "text": "Hola, mi nombre es Juan Pérez y tengo una alarma activada"
  },
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

#### 2. Feedback del Agente
```json
{
  "type": "feedback",
  "data": {
    "message": "⚠️ Falta completar el paso 1: Verificar identidad del cliente",
    "stepNumber": 1
  },
  "timestamp": "2025-01-16T10:30:05.000Z"
}
```

#### 3. Paso Completado
```json
{
  "type": "step-completed",
  "data": {
    "message": "✅ Paso 1 completado: Verificar identidad del cliente",
    "stepNumber": 1
  },
  "timestamp": "2025-01-16T10:30:10.000Z"
}
```

#### 4. Estado del Protocolo
```json
{
  "type": "protocol-status",
  "data": {
    "totalSteps": 5,
    "completedSteps": 2,
    "pendingSteps": [3, 4, 5],
    "missingCriticalSteps": [3],
    "compliancePercentage": 40
  },
  "timestamp": "2025-01-16T10:30:15.000Z"
}
```

#### 5. Error
```json
{
  "type": "error",
  "data": {
    "message": "Error al procesar audio"
  },
  "timestamp": "2025-01-16T10:30:20.000Z"
}
```

---

## Flujo de Prueba Completo

### Paso 1: Iniciar Sesión de Monitoreo
1. Ejecuta el request `POST /api/monitoring/start`
2. Copia el `sessionId` de la respuesta
3. Guarda el `sessionId` en las variables de entorno

### Paso 2: Conectar WebSocket
1. Crea un nuevo WebSocket request
2. Usa la URL: `ws://localhost:3000/ws/monitoring/{sessionId}`
3. Conecta al servidor

### Paso 3: Enviar Mensajes de Prueba
1. Envía un `ping` para verificar la conexión
2. Observa las respuestas del servidor en tiempo real

### Paso 4: Verificar Sesión Activa
1. Ejecuta el request `GET /api/monitoring/active`
2. Verifica que la sesión esté activa y contenga la información correcta

### Paso 5: Finalizar Sesión
1. Desde el WebSocket, envía: `{"type": "end-session"}`
2. O simplemente desconecta el WebSocket

---

## Ejemplos de Casos de Prueba

### Caso 1: Inicio de Monitoreo Exitoso
```json
POST /api/monitoring/start
{
  "eventID": "EVT-001",
  "accountId": "ACC-123",
  "operator": "María González",
  "code": "ALARMA-001",
  "zone": "Zona Principal",
  "accountObservation": "Cliente reporta movimiento en sensor PIR"
}
```

### Caso 2: Error - Datos Faltantes
```json
POST /api/monitoring/start
{
  "eventID": "EVT-002",
  "accountId": "ACC-456"
  // Falta 'operator' y 'code'
}
```
**Respuesta esperada:** `400 Bad Request`

### Caso 3: Obtener Sesión Activa (sin sesión previa)
```
GET /api/monitoring/active
```
**Respuesta esperada:** `404 Not Found`

---

## Tips y Trucos

1. **Automatización con Scripts:**
   - Usa el tab "Tests" para guardar automáticamente el `sessionId`
   - Crea scripts para validar respuestas

2. **Variables Dinámicas:**
   - Usa `{{session_id}}` en todos los requests que lo necesiten
   - Postman actualizará automáticamente las variables

3. **Pre-request Scripts:**
   - Puedes agregar lógica antes de cada request
   - Útil para generar datos de prueba dinámicos

4. **Colecciones:**
   - Organiza tus requests en carpetas
   - Crea una carpeta "Monitoreo" con todos los endpoints relacionados

5. **Exportar/Importar:**
   - Exporta tu colección para compartirla con el equipo
   - Importa colecciones de otros desarrolladores

---

## Solución de Problemas

### Error: "Connection refused"
- Verifica que el servidor esté corriendo en `http://localhost:3000`
- Revisa que no haya firewall bloqueando la conexión

### Error: "WebSocket connection failed"
- Verifica que el `sessionId` sea válido
- Asegúrate de haber iniciado una sesión primero con `/start`
- Revisa que la URL del WebSocket sea correcta

### Error: "400 Bad Request"
- Verifica que todos los campos requeridos estén presentes
- Revisa el formato JSON del body

### No recibo mensajes en WebSocket
- Verifica que la conexión esté activa (debería mostrar "Connected")
- Envía un `ping` para verificar la comunicación
- Revisa los logs del servidor para errores

---

## Recursos Adicionales

- [Documentación de Postman WebSocket](https://learning.postman.com/docs/sending-requests/websocket/)
- [Guía de Variables en Postman](https://learning.postman.com/docs/sending-requests/variables/)
- [Scripts de Postman](https://learning.postman.com/docs/writing-scripts/intro-to-scripts/)






