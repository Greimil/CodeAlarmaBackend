/**
 * Script de prueba para el Agente de Monitoreo
 * 
 * Uso:
 * 1. Inicia el servidor: npm run dev
 * 2. Ejecuta este script: npm run test:monitoring
 * 
 * Requiere Node.js 18+ (para fetch nativo)
 */

import WebSocket from 'ws';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

async function testMonitoringAgent() {
  console.log('🧪 Iniciando pruebas del Agente de Monitoreo...\n');

  try {
    // Paso 1: Iniciar sesión de monitoreo
    console.log('1️⃣ Creando sesión de monitoreo...');
    const startResponse = await fetch(`${API_URL}/api/monitoring/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventID: 'EVT-TEST-001',
        accountId: 'ACC-TEST-123',
        operator: 'Operador de Prueba',
        code: 'ALARMA-001',
        zone: 'Zona de Prueba',
        accountObservation: 'Prueba del sistema de monitoreo',
      }),
    });

    if (!startResponse.ok) {
      throw new Error(`Error al crear sesión: ${startResponse.statusText}`);
    }

    const sessionData = await startResponse.json();
    console.log('✅ Sesión creada:', sessionData.sessionId);
    console.log('📋 Resumen del protocolo:');
    console.log(sessionData.protocolSummary);
    console.log('\n📝 Pasos del protocolo:');
    sessionData.steps.forEach((step) => {
      console.log(`   ${step.stepNumber}. ${step.description}${step.isCritical ? ' [CRÍTICO]' : ''}`);
    });
    console.log('\n🔗 URL WebSocket:', sessionData.websocketUrl);

    // Paso 2: Conectar WebSocket
    console.log('\n2️⃣ Conectando WebSocket...');
    const ws = new WebSocket(`${WS_URL}/ws/monitoring/${sessionData.sessionId}`);

    ws.on('open', () => {
      console.log('✅ WebSocket conectado');
      
      // Paso 3: Simular envío de mensajes
      console.log('\n3️⃣ Simulando interacción...');
      
      // Enviar ping
      setTimeout(() => {
        console.log('📤 Enviando ping...');
        ws.send(JSON.stringify({ type: 'ping' }));
      }, 1000);

      // Simular transcripción (en producción esto sería audio real)
      setTimeout(() => {
        console.log('📤 Simulando transcripción de llamada...');
        // En un caso real, aquí enviarías chunks de audio
        // Por ahora, simulamos que el operador está hablando
        console.log('💬 Operador: "Central de monitoreo, habla Operador de Prueba"');
      }, 2000);

      // Finalizar sesión después de 10 segundos
      setTimeout(() => {
        console.log('\n4️⃣ Finalizando sesión...');
        ws.send(JSON.stringify({ type: 'end-session' }));
        setTimeout(() => {
          ws.close();
          console.log('✅ Prueba completada');
          process.exit(0);
        }, 1000);
      }, 10000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('\n📥 Mensaje recibido:', message.type);
        
        switch (message.type) {
          case 'transcription':
            console.log('   📝 Transcripción:', message.data.text);
            break;
          case 'feedback':
            console.log('   ⚠️  Feedback:', message.data.message);
            break;
          case 'step-completed':
            console.log('   ✅ Paso completado:', message.data.message);
            break;
          case 'protocol-status':
            console.log('   📊 Estado del protocolo:');
            console.log(`      - Pasos completados: ${message.data.completedSteps}/${message.data.totalSteps}`);
            console.log(`      - Cumplimiento: ${message.data.compliancePercentage}%`);
            break;
          case 'pong':
            console.log('   🏓 Pong recibido');
            break;
          case 'error':
            console.log('   ❌ Error:', message.data.message);
            break;
          default:
            console.log('   📦 Datos:', message.data);
        }
      } catch (error) {
        console.log('   📦 Mensaje binario (audio chunk) recibido');
      }
    });

    ws.on('error', (error) => {
      console.error('❌ Error en WebSocket:', error);
      process.exit(1);
    });

    ws.on('close', () => {
      console.log('\n🔌 WebSocket cerrado');
    });

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testMonitoringAgent();

