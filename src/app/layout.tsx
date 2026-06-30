import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memoria Viva Pico Truncado — Archivo Histórico Comunitario",
  description: "Iniciativa colaborativa enfocada en la preservación del patrimonio y la identidad local de Pico Truncado, impulsada por Edith Gómez, el Centro Chileno de Pico Truncado y Adrián Montet (Unión Vecinal Barrio YPF).",
  keywords: ["Pico Truncado", "Memoria Viva", "Archivo Histórico", "Patrimonio", "Barrio YPF", "Testimonios"],
  authors: [{ name: "Proyecto Memoria Viva" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
