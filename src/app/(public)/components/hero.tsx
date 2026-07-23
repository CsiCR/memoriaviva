'use client';

// Componente Hero Principal del Portal (Edición Museo)
// Archivo: src/app/(public)/components/hero.tsx

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ArrowDown } from "lucide-react";

interface HeroProps {
  title: string;
  subtitle: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  const handleScrollDown = () => {
    window.scrollTo({
      top: window.innerHeight - 72, // Restar altura de la cabecera aprox
      behavior: "smooth",
    });
  };

  return (
    <section className="museum-hero" aria-label="Presentación del Museo Comunitario">
      {/* 1. Fondo de Imagen Responsiva para Desktop */}
      <div className="hero-image-desktop museum-scale-in" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Image
          src="/images/pico-truncado-hero.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>

      {/* 2. Fondo de Imagen Responsiva para Mobile */}
      <div className="hero-image-mobile museum-scale-in" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Image
          src="/images/pico-truncado-hero-mobile.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>

      {/* 3. Overlay Gradual de Contraste para asegurar legibilidad */}
      <div className="museum-hero-overlay" />

      {/* 4. Contenido del Museo */}
      <div className="museum-hero-content">
        <span
          className="museum-animate museum-delay-1"
          style={{
            display: "inline-block",
            backgroundColor: "rgba(21, 136, 230, 0.15)",
            color: "var(--primary-blue-light)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "0.4rem 1.2rem",
            borderRadius: "9999px",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-headings)",
          }}
        >
          Museo Comunitario Digital
        </span>

        <h1 className="museum-hero-title museum-animate museum-delay-2">
          Nuestra historia. <span>Nuestro lugar.</span>
        </h1>

        <p className="museum-hero-intro museum-animate museum-delay-2">
          Memoria Viva Pico Truncado es un espacio comunitario donde nuestras historias se encuentran, se preservan y se comparten con las generaciones presentes y futuras.
        </p>

        <div className="museum-hero-buttons museum-animate museum-delay-3">
          <Link
            href="/aportar"
            className="btn btn-museum-primary"
            aria-label="Aportar una historia al formulario"
          >
            Aportá tu historia <ChevronRight size={18} />
          </Link>
          <Link
            href="/contributions"
            className="btn btn-museum-secondary"
            aria-label="Explorar el archivo público de memorias"
          >
            Explorar la memoria
          </Link>
        </div>

        <span className="museum-hero-complementary museum-animate museum-delay-4">
          Cada recuerdo es una pieza de nuestra historia colectiva.
        </span>
      </div>

      {/* 5. Indicador de Desplazamiento */}
      <div
        className="museum-scroll-indicator-container scroll-indicator museum-animate museum-delay-4"
        onClick={handleScrollDown}
        role="button"
        tabIndex={0}
        aria-label="Desplazarse hacia abajo"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleScrollDown();
          }
        }}
      >
        <span className="museum-scroll-indicator-text">Explorar</span>
        <ArrowDown size={18} />
      </div>
    </section>
  );
}
