

// crea-db.ts - IMPORTACIONES CORRECTAS
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


async function crearBaseMemoria() {
  // Rutas relativas a la carpeta resources
  const resourcesDir = path.join(__dirname, "..", "resources");
  const pdfPath = path.join(resourcesDir, "Manual_de_Respuesta_a_Eventos_Prioritarios12-18-25.pdf");
  const outputPath = path.join(resourcesDir, "knowledge-base.json");
  
  console.log("📄 Buscando PDF en:", pdfPath);
  
  try {
    await fs.access(pdfPath);
    console.log("✅ Archivo PDF encontrado");
  } catch (error) {
    console.error("❌ Error: No se encontró el archivo PDF en:", pdfPath);
    console.error("   Asegúrate de que el archivo existe en la carpeta resources/");
    process.exit(1);
  }
  
  try {
    console.log("📖 Cargando PDF...");
    // 1. Carga PDF
    const loader = new PDFLoader(pdfPath);
    const rawDocs = await loader.load();
    console.log(`✅ PDF cargado: ${rawDocs.length} páginas encontradas`);
    
    // 2. Split
    console.log("✂️ Dividiendo el documento en chunks...");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
    const docs = await splitter.splitDocuments(rawDocs);
    console.log(`✅ Documento dividido en ${docs.length} chunks`);
    
    // 3. GUARDAR EN JSON (persistente sin vectorstore)
    console.log("💾 Guardando base de conocimiento...");
    const data = {
      docs: docs.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata
      })),
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      outputPath,
      JSON.stringify(data, null, 2)
    );
    
    console.log("✅ Base de conocimiento regenerada exitosamente!");
    console.log(`📊 Total de documentos: ${docs.length}`);
    console.log(`📁 Archivo guardado en: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error al procesar el PDF:", error);
    if (error instanceof Error) {
      console.error("   Mensaje:", error.message);
    }
    process.exit(1);
  }
}

crearBaseMemoria().catch((error) => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});
