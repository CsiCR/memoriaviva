// Página de Recurso No Encontrado (HTTP 404)
// Archivo: src/app/not-found.tsx

import Link from 'next/link';

export default function NotFound() {
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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        
        <h1 
          style={{
            fontSize: '1.75rem',
            fontFamily: 'var(--font-headings)',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}
        >
          Página no encontrada
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
          La memoria o sección que buscás no existe o fue movida de lugar.
        </p>

        <Link href="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
