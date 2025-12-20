// @ts-nocheck
import { tool } from "langchain";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import path, { dirname } from "path";
import fs from "fs/promises";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar la base de conocimiento (reutilizar la misma que QaAgent)
const dataPath = path.join(__dirname, "../../../../resources/knowledge-base.json");
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

const embeddings = new OpenAIEmbeddings();
const vectorStore = new MemoryVectorStore(embeddings);

const docs = data.docs.map(
  (d) =>
    new Document({
      pageContent: d.pageContent,
      metadata: d.metadata,
    })
);

await vectorStore.addDocuments(docs);
const retriever = vectorStore.asRetriever({ k: 4 });

// Reutilizar la herramienta buscar_manual
export const searchPDF = tool(
  async ({ query }) => {
    const results = await retriever.invoke(query);
    return results
      .map(
        (doc, i) =>
          `CONTEXTO ${i + 1} (Página ${doc.metadata.page || "?"}):\n\n${
            doc.pageContent
          }`
      )
      .join("\n\n" + "=".repeat(60) + "\n\n");
  },
  {
    name: "buscar_manual",
    description: "Busca respuestas en el manual de eventos prioritarios",
    schema: z.object({
      query: z.string().describe("Pregunta o término a buscar"),
    }),
  }
);

// Nueva herramienta para verificar si un paso fue completado
export const checkStepCompletion = tool(
  async ({ transcription, stepDescription }) => {
    // Análisis simple: buscar palabras clave del paso en la transcripción
    const stepKeywords = stepDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3); // Filtrar palabras muy cortas

    const transcriptionLower = transcription.toLowerCase();
    const foundKeywords = stepKeywords.filter((keyword) =>
      transcriptionLower.includes(keyword)
    );

    const completionScore = foundKeywords.length / stepKeywords.length;

    return {
      completed: completionScore > 0.5, // 50% de palabras clave encontradas
      score: completionScore,
      foundKeywords: foundKeywords,
      message: completionScore > 0.5
        ? `Paso completado (${Math.round(completionScore * 100)}% de coincidencia)`
        : `Paso no completado (${Math.round(completionScore * 100)}% de coincidencia)`,
    };
  },
  {
    name: "check_step_completion",
    description:
      "Verifica si un paso del protocolo fue completado basándose en la transcripción de la llamada",
    schema: z.object({
      transcription: z.string().describe("Transcripción completa o parcial de la llamada"),
      stepDescription: z.string().describe("Descripción del paso a verificar"),
    }),
  }
);

