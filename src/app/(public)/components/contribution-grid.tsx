// Componente de Grilla de Aportes
// Archivo: src/app/(public)/components/contribution-grid.tsx

import React from "react";

interface ContributionGridProps {
  children: React.ReactNode;
}

export default function ContributionGrid({ children }: ContributionGridProps) {
  return (
    <div
      className="grid grid-3"
      style={{
        gap: "2rem",
        marginBottom: "3rem",
      }}
    >
      {children}
    </div>
  );
}
