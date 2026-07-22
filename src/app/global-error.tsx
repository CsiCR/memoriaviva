'use client';

// Manejador de Errores Críticos Globales (Layout Raíz)
// Archivo: src/app/global-error.tsx

import { useEffect } from 'react';
import { ObservabilityService } from '@/lib/observability';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Registrar el error crítico a nivel servidor/observabilidad
    ObservabilityService.captureError(error, { context: 'Global Error Boundary' });
  }, [error]);

  return (
    <html lang="es">
      <body 
        style={{ 
          margin: 0, 
          padding: 0, 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#FAFAF5', 
          fontFamily: 'sans-serif' 
        }}
      >
        <div 
          style={{ 
            maxWidth: '500px', 
            padding: '3rem 2rem', 
            borderRadius: '12px', 
            backgroundColor: '#ffffff', 
            border: '1px solid #e5e5dc', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', 
            textAlign: 'center' 
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#2d3748' }}>
            Ocurrió un error crítico en el sistema
          </h1>
          <p style={{ color: '#5A5A5A', marginBottom: '2rem', fontSize: '1rem' }}>
            No pudimos cargar el sitio. Podés intentar nuevamente para reestablecer la sesión.
          </p>
          <button 
            onClick={() => reset()}
            style={{ 
              padding: '0.75rem 1.75rem', 
              borderRadius: '12px', 
              border: 'none', 
              backgroundColor: '#1588e6', 
              color: '#ffffff', 
              fontWeight: 600, 
              fontSize: '0.95rem', 
              cursor: 'pointer' 
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
