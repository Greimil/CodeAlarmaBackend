//  @ts-nocheck

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

// Ruta a la base de conocimiento en resources
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

const searchUserReportsFunction = async ({
  userId,
}: {
  userId: string;
}): Promise<string> => {
  const reports = await prisma.processedEvents.findMany({
    where: {
      Operator: userId,
    },
    select: {
      slaTime: true,
      operatorJustify: true,
      operatorComment: true,
      complianceSlatime: true,
      accoundId: true,
    },
  });

  if (!reports) {
    return `No se encontraron reportes para el operador con ID: ${userId}.`;
  }

  return `Reportes encontrados para el operador ${userId}:\n${JSON.stringify(
    reports,
    null,
    2
  )}`;
};

export const searchUserReportsTool = tool(searchUserReportsFunction, {
  name: "search_user_reports",
  description:
    "Busca y recupera una lista de reportes que tenga un usuario, dado su ID de usuario (userId).",
  schema: z.object({
    userId: z
      .string()
      .describe(
        "El ID único del usuario cuyos reportes se desean buscar. Por ejemplo: 'user123'."
      ),
  }),
});
