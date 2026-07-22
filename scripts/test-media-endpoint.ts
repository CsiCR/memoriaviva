// Script de prueba para el endpoint de media público
// Archivo: scripts/test-media-endpoint.ts

import { GET } from "../src/app/api/public/media/[id]/route";
import { NextRequest } from "next/server";

async function main() {
  console.log("=== PROBANDO ENDPOINT DE MEDIA PÚBLICO ===");
  
  const fileId = "4fe150de-5659-4da5-99ca-5dba507528e2";
  const req = new NextRequest(`http://localhost:3000/api/public/media/${fileId}`);
  
  // En Next.js 15+, params es una Promesa
  const paramsPromise = Promise.resolve({ id: fileId });

  console.log("Invocando GET handler...");
  const response = await GET(req, { params: paramsPromise });

  console.log("--- RESPUESTA ---");
  console.log("Status:", response.status);
  console.log("Headers:");
  response.headers.forEach((val, key) => {
    console.log(`  ${key}: ${val}`);
  });

  if (response.status !== 200) {
    const text = await response.text();
    console.log("Cuerpo del error:", text);
  } else {
    const blob = await response.blob();
    console.log("Descarga exitosa de media a través del endpoint!");
    console.log("Tamaño del blob devuelto:", blob.size, "bytes");
  }
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
