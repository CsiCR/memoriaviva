import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-headings-google",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body-google",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif-google",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memoria Viva Pico Truncado — Archivo Histórico Comunitario",
  description: "Iniciativa colaborativa enfocada en la preservación del patrimonio y la identidad local de Pico Truncado, impulsada por Edith Gómez, el Centro Chileno de Pico Truncado y Adrián Montet (Unión Vecinal Barrio YPF).",
  keywords: ["Pico Truncado", "Memoria Viva", "Archivo Histórico", "Patrimonio", "Barrio YPF", "Testimonios"],
  authors: [{ name: "Proyecto Memoria Viva" }],
};

export const viewport: Viewport = {
  themeColor: "#1588e6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${openSans.variable} ${playfairDisplay.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
