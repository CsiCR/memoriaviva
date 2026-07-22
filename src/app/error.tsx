'use client';

// Página de Error Amigable
// Archivo: src/app/error.tsx

import { useEffect } from 'react';
import Link from 'next/link';
import { ObservabilityService } from '@/lib/observability';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Registrar el error en la consola usando observabilidad
    ObservabilityService.captureError(error, { context: 'Page Error Boundary' });
  }, [error]);

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'var(--warm-white)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div 
        style={{
          maxWidth: '500px',
          padding: '3rem 2rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--white)',
          border: '1px solid var(--border-warm)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        
        <h1 
          style={{
            fontSize: '1.5rem',
            fontFamily: 'var(--font-headings)',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}
        >
          No pudimos cargar esta parte del archivo.
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
          Ocurrió un problema temporal al procesar la solicitud. Podés intentar nuevamente o volver al inicio.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={() => reset()}
            style={{ cursor: 'pointer' }}
          >
            Intentar nuevamente
          </button>
          
          <Link href="/" className="btn btn-outline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
