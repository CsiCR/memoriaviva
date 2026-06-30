import { Shield, EyeOff, Lock, FileCheck } from 'lucide-react';

export default function Privacidad() {
  return (
    <div className="container section" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', 
          backgroundColor: 'var(--hope-green-light)', 
          color: 'var(--hope-green)', 
          padding: '0.75rem', 
          borderRadius: '50%',
          marginBottom: '1rem'
        }}>
          <Shield size={32} />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Políticas de Privacidad y Consentimiento</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Comprometidos con el resguardo ético de tu memoria familiar y comunitaria</p>
      </div>

      {/* Texto legal solicitado */}
      <div className="card" style={{ 
        backgroundColor: 'var(--hope-green-light)', 
        border: '1px solid rgba(46, 139, 87, 0.2)', 
        padding: '2rem', 
        marginBottom: '2.5rem',
        borderRadius: 'var(--radius-lg)'
      }}>
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#1b5e20', 
          fontWeight: '500', 
          lineHeight: '1.7', 
          margin: 0,
          fontStyle: 'italic'
        }}>
          “El Proyecto Memoria Viva Pico Truncado recibe materiales históricos aportados voluntariamente por vecinos, familias e instituciones. Cada aporte será conservado, catalogado y revisado según el nivel de autorización elegido por el aportante. Ningún material será publicado automáticamente. Toda publicación será revisada previamente por el equipo responsable.”
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Niveles de Autorización */}
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={22} style={{ color: 'var(--primary-blue)' }} /> Niveles de Autorización Disponibles
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Al realizar tu aporte, podrás seleccionar de manera explícita en qué ámbitos autorizas el uso del material:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--border-warm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
              <strong>Nivel A — Uso público completo:</strong> Autoriza la publicación en el libro físico, e-book digital, archivo digital comunitario accesible en la web, redes sociales institucionales, muestras fotográficas físicas y material educativo escolar.
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--border-warm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
              <strong>Nivel B — Uso editorial y educativo:</strong> Autoriza el uso exclusivo para la redacción del libro, e-book digital y actividades en escuelas de la localidad, sin publicación en redes sociales abiertas o internet de forma masiva.
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--border-warm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
              <strong>Nivel C — Archivo histórico interno:</strong> Conservación exclusiva para catalogación, restauración y preservación en el archivo físico e interno del proyecto. No se realizará ninguna publicación pública sin una autorización escrita adicional firmada a futuro.
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--border-warm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
              <strong>Nivel D — Material restringido:</strong> Acceso estrictamente limitado al comité editorial autorizado del proyecto. Reservado para materiales extremadamente sensibles que requieren custodia.
            </div>
          </div>
        </div>

        {/* Preferencia de Créditos */}
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <EyeOff size={22} style={{ color: 'var(--primary-blue)' }} /> Preferencia de Créditos y Autoría
          </h2>
          <p>
            Reconocemos el derecho moral de cada aportante. En el formulario podrás elegir cómo deseas que figure tu autoría en las futuras publicaciones:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Nombre completo:</strong> Ejemplo: "Aporte de Juan Carlos Pérez".</li>
            <li><strong>Iniciales:</strong> Ejemplo: "Aporte de J. C. P.".</li>
            <li><strong>Familia aportante:</strong> Ejemplo: "Aporte de la Familia Pérez-Giménez".</li>
            <li><strong>Anónimo:</strong> Se guardará el registro administrativo interno, pero el material se exhibirá como "Aporte Anónimo".</li>
          </ul>
        </div>

        {/* Seguridad técnica */}
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={22} style={{ color: 'var(--primary-blue)' }} /> Resguardo Técnico Seguro
          </h2>
          <p style={{ margin: 0 }}>
            Toda la información y los archivos que subas se almacenarán en servidores seguros a través de la tecnología Supabase Storage en un bucket con acceso restringido. Solamente los miembros del equipo editorial autenticados mediante contraseña y con roles validados podrán acceder a ver tus datos de contacto y descargar tus archivos adjuntos. El público general no tendrá acceso directo a los archivos cargados hasta que sean validados y aprobados bajo el nivel correspondiente.
          </p>
        </div>
      </div>
    </div>
  );
}
