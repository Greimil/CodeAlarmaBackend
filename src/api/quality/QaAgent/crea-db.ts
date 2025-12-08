// // // 1. crea-db.ts (ejecuta UNA VEZ)
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// import { OpenAIEmbeddings } from "@langchain/openai";
// import { Chroma } from "@langchain/community/vectorstores/chroma"; // ← Persistente
// import 'dotenv/config';
// import { fileURLToPath } from "url";
// import { dirname, join } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// async function crearBasePersistente() {
//   const loader = new PDFLoader(join(__dirname, 'manual_respuestas_eventos_prioritarios'));
//   const docsRaw = await loader.load();
  
//   const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000, chunkOverlap: 200
//   });
//   const docs = await splitter.splitDocuments(docsRaw);
  
//   const embeddings = new OpenAIEmbeddings();
  
//   // ¡GUARDA EN DISCO AUTOMÁTICO!
//   await Chroma.fromDocuments(docs, embeddings, {
//     collectionName: "manual_respuestas_eventos_prioritarios",
//   });
  
//   console.log("💾 Base guardada en Chroma!");
// }

// // Ejecuta: npx tsx crea-db.ts
// crearBasePersistente();


// crea-db-memory.ts - SIN SERVIDOR - FUNCIONA 100%

// crea-db.ts - IMPORTACIONES CORRECTAS
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


async function crearBaseMemoria() {
  const pdfPath = path.join(__dirname, "manual_respuestas_eventos_prioritarios");
  
  console.log("🔍 Verificando:", pdfPath);
  
  try {
    await fs.access(pdfPath);
  } catch {
    console.error(`❌ NO ENCONTRADO: ${pdfPath}`);
    console.log("Archivos aquí:", (await fs.readdir(__dirname)).filter(f => f.includes('manual')));
    return;
  }
  
  console.log("📄 Cargando PDF...");
  
  // 1. Carga PDF
  const loader = new PDFLoader(pdfPath);
  const rawDocs = await loader.load();
  console.log(`📄 ${rawDocs.length} páginas cargadas`);
  
  // 2. Split
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });
  const docs = await splitter.splitDocuments(rawDocs);
  console.log(`✂️ ${docs.length} chunks creados`);
  
  // 3. GUARDAR EN JSON (persistente sin vectorstore)
  const data = {
    docs: docs.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata
    })),
    createdAt: new Date().toISOString()
  };
  
  await fs.writeFile(
    path.join(__dirname, "knowledge-base.json"),
    JSON.stringify(data, null, 2)
  );
  
  console.log("🎉 ¡BASE CREADA!");
  console.log("💾 knowledge-base.json");
  console.log(`📊 ${data.docs.length} chunks listos`);
}

crearBaseMemoria().catch(console.error);
