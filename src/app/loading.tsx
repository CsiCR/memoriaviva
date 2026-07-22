// Pantalla de Carga y Transición (Loading State)
// Archivo: src/app/loading.tsx

export default function Loading() {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        backgroundColor: 'transparent',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div 
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border-color)',
          borderTop: '3px solid var(--primary-blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
        Cargando patrimonio histórico...
      </p>
    </div>
  );
}
