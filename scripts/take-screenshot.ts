// Script para tomar capturas de pantalla de la aplicación usando Puppeteer
// Archivo: scripts/take-screenshot.ts

import puppeteer from "puppeteer";
import * as path from "path";

const filename = process.argv[2] || "screenshot.jpg";
const isMobile = process.argv[3] === "mobile";
const targetPath = path.resolve(process.argv[4] || filename);

async function main() {
  console.log(`=== INICIANDO CAPTURA: ${filename} (Mobile: ${isMobile}) ===`);
  console.log(`Destino: ${targetPath}`);

  // Iniciar navegador
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    if (isMobile) {
      // Emular un iPhone X/11/12
      await page.setViewport({
        width: 375,
        height: 812,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      // User agent de móvil
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
      );
    } else {
      // Resolucion desktop estandar
      await page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1.5,
      });
    }

    // Navegar al servidor dev
    console.log("Navegando a http://localhost:3000 ...");
    await page.goto("http://localhost:3000", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Esperar un segundo extra para asegurar carga de tipografías y renderizado
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Tomar captura
    console.log("Tomando captura...");
    await page.screenshot({
      path: targetPath,
      type: "jpeg",
      quality: 85,
    });

    console.log(`✓ Captura guardada con éxito en: ${targetPath}`);
  } catch (error) {
    console.error("❌ Error durante la captura:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
