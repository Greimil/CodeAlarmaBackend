# Estructura del Proyecto Backend

Este documento describe la organización de carpetas y archivos del proyecto backend.

## 📁 Estructura de Carpetas

```
backend/
├── docs/                    # Documentación del proyecto
│   ├── POSTMAN-GUIDE.md
│   ├── README-TESTING.md
│   └── test-monitoring.md
│
├── resources/               # Recursos estáticos y archivos de datos
│   ├── knowledge-base.json
│   └── manual_respuestas_eventos_prioritarios
│
├── scripts/                 # Scripts de utilidad y mantenimiento
│   └── create-knowledge-base.ts
│
├── tests/                   # Archivos de prueba y testing
│   ├── test-monitoring-client.js
│   └── test-monitoring-simple.html
│
├── prisma/                  # Esquema y migraciones de base de datos
│   ├── schema.prisma
│   └── migrations/
│
└── src/                     # Código fuente principal
    ├── api/                 # Módulos de API organizados por dominio
    │   ├── monitoring/      # API de monitoreo
    │   │   ├── dto/         # Data Transfer Objects
    │   │   ├── types/       # Tipos TypeScript específicos
    │   │   ├── MonitoringAgent/
    │   │   ├── WhisperService/
    │   │   ├── monitoring.controller.ts
    │   │   ├── monitoring.router.ts
    │   │   ├── monitoring.service.ts
    │   │   ├── monitoring.websocket.ts
    │   │   └── polling.service.ts
    │   │
    │   └── quality/         # API de calidad
    │       ├── dto/
    │       ├── mappers/     # Mappers para transformación de datos
    │       ├── QaAgent/
    │       ├── quality.controller.ts
    │       ├── quality.router.ts
    │       ├── quality.service.ts
    │       └── quality.service.test.ts
    │
    ├── generated/           # Código generado (Prisma, etc.)
    ├── lib/                 # Utilidades y librerías compartidas
    ├── middleware/          # Middlewares de Express
    ├── types/               # Tipos TypeScript globales
    ├── app.ts
    ├── routes.ts
    └── server.ts
```

## 📝 Convenciones de Nombres

### Archivos TypeScript
- **Servicios**: `*.service.ts` (ej: `quality.service.ts`, `monitoring.service.ts`)
- **Controladores**: `*.controller.ts` (ej: `quality.controller.ts`)
- **Routers**: `*.router.ts` (ej: `quality.router.ts`)
- **DTOs**: `*.dto.ts` (ej: `monitoring.dto.ts`)
- **Tipos**: `*.types.ts` (ej: `monitoring.types.ts`)
- **Tests**: `*.test.ts` o `*.spec.ts` (ej: `quality.service.test.ts`)

### Carpetas
- Usar **kebab-case** para nombres de carpetas (ej: `monitoring-agent/`)
- Usar **PascalCase** para carpetas de componentes/agentes (ej: `MonitoringAgent/`)

## 🔄 Mappers

Los mappers están consolidados en `src/api/quality/mappers/`:
- `QaMapper.ts`: Contiene todas las funciones de mapeo relacionadas con quality
  - `mapAPiRes()`: Mapea eventos de la API externa a DTOs
  - `toPrismaProcessedEvent()`: Mapea eventos evaluados a formato Prisma

## 📚 Recursos

Los recursos estáticos (archivos de datos, PDFs, etc.) están en `resources/`:
- `knowledge-base.json`: Base de conocimiento generada
- `manual_respuestas_eventos_prioritarios`: Manual en formato PDF

## 🧪 Tests

Los archivos de prueba están organizados en:
- `tests/`: Archivos de prueba manuales y scripts de testing
- `src/**/*.test.ts`: Tests unitarios junto al código fuente

## 📖 Documentación

La documentación está en `docs/`:
- Guías de uso de API
- Documentación de testing
- Notas y guías de desarrollo

## 🛠️ Scripts

Scripts de utilidad en `scripts/`:
- `create-knowledge-base.ts`: Genera la base de conocimiento desde el PDF

## ⚙️ Configuración

- `tsconfig.json`: Configuración de TypeScript
- `vitest.config.ts`: Configuración de tests
- `prisma.config.ts`: Configuración de Prisma
- `package.json`: Dependencias y scripts del proyecto
