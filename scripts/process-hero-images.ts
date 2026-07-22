// Script para optimizar y crear variantes de la imagen panorámica del Hero
// Archivo: scripts/process-hero-images.ts

import sharp from "sharp";
import * as path from "path";
import * as fs from "fs";

const publicImagesDir = path.resolve(process.cwd(), "public", "images");
const sourcePath = path.join(publicImagesDir, "pico-truncado-panorama.jpg");
const destDesktopPath = path.join(publicImagesDir, "pico-truncado-hero.webp");
const destMobilePath = path.join(publicImagesDir, "pico-truncado-hero-mobile.webp");

async function main() {
  console.log("=== INICIANDO PROCESAMIENTO DE IMÁGENES DE PORTADA ===");

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ La imagen origen no existe en: ${sourcePath}`);
    process.exit(1);
  }

  // 1. Obtener metadatos de la imagen original
  const metadata = await sharp(sourcePath).metadata();
  console.log(`✓ Imagen original detectada: ${metadata.width}x${metadata.height} px`);

  const width = metadata.width || 1024;
  const height = metadata.height || 561;

  // 2. Generar versión optimizada para Desktop (WebP)
  console.log("Generando pico-truncado-hero.webp (Desktop)...");
  await sharp(sourcePath)
    .webp({ quality: 85 })
    .toFile(destDesktopPath);
  console.log("✓ pico-truncado-hero.webp creado con éxito.");

  // 3. Generar versión para Mobile (Corte y apilado vertical)
  // Dividimos la imagen a la mitad horizontalmente
  const halfWidth = Math.floor(width / 2);
  console.log(`Generando pico-truncado-hero-mobile.webp (Mobile) - Cortando a ${halfWidth}x${height} px...`);

  // Extraer la mitad izquierda (Pico Truncado histórico / sepia)
  const leftHalf = await sharp(sourcePath)
    .extract({ left: 0, top: 0, width: halfWidth, height: height })
    .toBuffer();

  // Extraer la mitad derecha (Pico Truncado actual / nieve)
  const rightHalf = await sharp(sourcePath)
    .extract({ left: halfWidth, top: 0, width: halfWidth, height: height })
    .toBuffer();

  // Crear una nueva imagen uniendo ambas verticalmente
  // Altura total = altura * 2
  const totalMobileHeight = height * 2;
  await sharp({
    create: {
      width: halfWidth,
      height: totalMobileHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: leftHalf, top: 0, left: 0 },
      { input: rightHalf, top: height, left: 0 }
    ])
    .webp({ quality: 85 })
    .toFile(destMobilePath);

  console.log("✓ pico-truncado-hero-mobile.webp creado con éxito.");
  console.log("=== PROCESAMIENTO COMPLETADO CON ÉXITO ===");
}

main().catch((err) => {
  console.error("❌ Ocurrió un error al procesar las imágenes:", err);
  process.exit(1);
});
