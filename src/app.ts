import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import routes from "./routes";
import { setupMonitoringWebSocket } from "./api/monitoring/monitoring.websocket";

const baseApp = express();
const { app } = expressWs(baseApp);

// Configurar CORS para permitir peticiones desde el frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware para parsear JSON
app.use(express.json());

// Rutas HTTP
app.use("/api", routes);

// Configurar WebSocket para monitoreo
setupMonitoringWebSocket(app);

export default app;
