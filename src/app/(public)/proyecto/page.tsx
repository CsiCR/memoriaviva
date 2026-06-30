import Link from 'next/link';
import { BookOpen, Book, Users, Landmark, FileText, ArrowRight } from 'lucide-react';

export default function Proyecto() {
  return (
    <div className="container section" style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Sobre el Proyecto</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Memoria Viva Pico Truncado es una iniciativa comunitaria e institucional que nace de la necesidad de resguardar los recuerdos y el patrimonio intangible de nuestra localidad antes de que el paso del tiempo los desvanezca.
        </p>
      </div>

      {/* Quiénes Somos */}
      <div className="card" style={{ marginBottom: '3rem', borderLeft: '5px solid var(--primary-blue)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={22} style={{ color: 'var(--primary-blue)' }} /> Impulsores de la Iniciativa
        </h2>
        <p style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
          Este proyecto es el fruto del esfuerzo conjunto y de la colaboración estrecha de referentes de nuestra comunidad:
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li>
            <strong>Edith Gómez</strong>, junto con el <strong>Centro Chileno de Pico Truncado</strong>, aportando su trayectoria en la integración y el resguardo de la herencia cultural regional.
          </li>
          <li>
            <strong>Adrián Montet</strong>, en representación de la <strong>Unión Vecinal Barrio YPF</strong>, encarnando el espíritu de pertenencia, la historia barrial y el compromiso vecinal de un sector fundacional de nuestra ciudad.
          </li>
        </ul>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Juntos coordinan el equipo de redacción y catalogación que revisará el material histórico para transformarlo en patrimonio público.
        </p>
      </div>

      {/* Propósitos Futuros */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>¿Qué haremos con los materiales recibidos?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          El MVP (Etapa 1) está enfocado en la recopilación segura y organizada de los datos y archivos. En las etapas futuras, este valioso archivo comunitario dará vida a:
        </p>

        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ 
              backgroundColor: 'var(--primary-blue-light)', 
              color: 'var(--primary-blue)', 
              padding: '0.5rem', 
              borderRadius: '8px' 
            }}>
              <Book size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Libro Impreso e E-book</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Edición de una obra literaria e histórica que recopile las memorias y fotografías más representativas de Pico Truncado.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ 
              backgroundColor: 'var(--hope-green-light)', 
              color: 'var(--hope-green)', 
              padding: '0.5rem', 
              borderRadius: '8px' 
            }}>
              <Landmark size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Archivo Comunitario Digital</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Un repositorio centralizado donde historiadores, estudiantes y público puedan consultar documentos validados.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ 
              backgroundColor: '#fffbeb', 
              color: '#d97706', 
              padding: '0.5rem', 
              borderRadius: '8px' 
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Material Educativo</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Guías didácticas y cuadernillos para que las escuelas de la provincia trabajen la historia local en el aula.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ 
              backgroundColor: '#fdf2f8', 
              color: '#db2777', 
              padding: '0.5rem', 
              borderRadius: '8px' 
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Futuro Museo Virtual</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Una plataforma interactiva con líneas de tiempo y mapas históricos para recorrer la evolución de Pico Truncado.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Espíritu del Proyecto */}
      <div style={{ 
        backgroundColor: '#FAFAF5', 
        border: '1px solid var(--border-warm)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '2rem',
        marginBottom: '3rem'
      }}>
        <h3 style={{ marginBottom: '0.75rem' }}>El Espíritu de la Unión Vecinal Barrio YPF</h3>
        <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
          Inspirados en la historia del Barrio YPF, buscamos reflejar el orgullo local, el esfuerzo de los pioneros del petróleo y el ferrocarril, y la calidez del encuentro vecinal. Queremos construir un puente entre las viejas generaciones y los jóvenes de Pico Truncado, porque la memoria no es solo pasado, sino el cimiento de nuestro futuro.
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/aportar" className="btn btn-primary">
          Sumar mi aporte ahora <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
