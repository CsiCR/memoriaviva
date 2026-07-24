// Componente de Estadísticas de Exploración Pública (Edición Narrativa)
// Archivo: src/app/(public)/components/stats.tsx

import { Heart, Camera, FileText, Users, Library, Award } from "lucide-react";
import { ExploreStats } from "@/lib/public/explore/types";
import NarrativeSection from "./narrative-section";

interface StatsProps {
  stats: ExploreStats;
}

export default function Stats({ stats }: StatsProps) {
  const statItems = [
    {
      label: "Aportes preservados",
      value: stats.totalContributions,
      icon: <Heart size={24} />,
      color: "var(--primary-blue)",
      bg: "var(--primary-blue-light)",
    },
    {
      label: "Fotografías históricas",
      value: stats.totalPhotographs,
      icon: <Camera size={24} />,
      color: "#d97706",
      bg: "#fffbeb",
    },
    {
      label: "Documentos digitalizados",
      value: stats.totalDocuments,
      icon: <FileText size={24} />,
      color: "var(--hope-green)",
      bg: "var(--hope-green-light)",
    },
    {
      label: "Vecinos entrevistados",
      value: stats.totalInterviewees,
      icon: <Users size={24} />,
      color: "#7c3aed",
      bg: "#faf5ff",
    },
    {
      label: "Instituciones colaboradoras",
      value: stats.totalInstitutions,
      icon: <Library size={24} />,
      color: "#db2777",
      bg: "#fdf2f8",
    },
    {
      label: "Colaboradores activos",
      value: stats.totalContributors,
      icon: <Award size={24} />,
      color: "#059669",
      bg: "#ecfdf5",
    },
  ];

  return (
    <NarrativeSection
      title="Nuestra memoria compartida"
      subtitle="Miles de recuerdos ya forman parte del archivo histórico comunitario."
      ariaLabel="Métricas del Archivo"
      backgroundColor="var(--warm-white)"
      borderBottom={true}
      borderTop={true}
    >
      <div className="grid grid-3" style={{ gap: "2rem" }}>
        {statItems.map((item, index) => (
          <div
            key={index}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-warm)",
              backgroundColor: "var(--white)",
              boxShadow: "var(--shadow-sm)",
              transition: "var(--transition-smooth)",
            }}
            role="group"
            aria-label={`Estadística: ${item.label}`}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                backgroundColor: item.bg,
                color: item.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div>
              <span
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#1a202c",
                  display: "block",
                }}
              >
                {item.value}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </NarrativeSection>
  );
}

