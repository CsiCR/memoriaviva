import Link from 'next/link';
import { ChevronRight, Shield, Heart, FileText, Users, MapPin, Calendar } from 'lucide-react';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="section" style={{ 
        background: 'linear-gradient(135deg, #eef7ff 0%, #FAFAF5 100%)', 
        paddingTop: '6rem', 
        paddingBottom: '6rem', 
        borderBottom: '1px solid var(--border-warm)',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <span style={{ 
            display: 'inline-block', 
            backgroundColor: 'var(--primary-blue-light)', 
            color: 'var(--primary-blue)', 
            padding: '0.4rem 1rem', 
            borderRadius: '9999px', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-headings)'
          }}>
            INICIATIVA COLABORATIVA HISTÓRICA
          </span>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1.2, color: '#1a202c', marginBottom: '1.5rem' }}>
            Preservemos Juntos la Historia de Pico Truncado
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Memoria Viva es un espacio comunitario impulsado por vecinas, vecinos e instituciones locales para reunir, conservar y poner en valor testimonios, fotografías, audios y documentos que narran nuestra identidad local.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/aportar" className="btn btn-primary" style={{ minWidth: '200px' }}>
              Aportar una memoria <ChevronRight size={18} />
            </Link>
            <Link href="/proyecto" className="btn btn-secondary" style={{ minWidth: '200px' }}>
              Conocer el proyecto
            </Link>
          </div>
        </div>
      </section>

      {/* Objetivos */}
      <section className="section" style={{ backgroundColor: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem' }}>Objetivos de la Iniciativa</h2>
            <p style={{ maxWidth: '600px', margin: '0 auto', color: 'var(--text-secondary)' }}>
              Buscamos que la historia de Pico Truncado no se pierda y sea la base para futuras producciones y educación comunitaria.
            </p>
          </div>

          <div className="grid grid-3">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--primary-blue-light)', 
                color: 'var(--primary-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Heart size={24} />
              </div>
              <h3 className="card-title">Preservar la Identidad</h3>
              <p style={{ fontSize: '0.95rem', margin: 0 }}>
                Recopilar vivencias de familias, instituciones y pioneros que forjaron nuestra ciudad en sus distintos barrios.
              </p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--hope-green-light)', 
                color: 'var(--hope-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={24} />
              </div>
              <h3 className="card-title">Archivo Comunitario</h3>
              <p style={{ fontSize: '0.95rem', margin: 0 }}>
                Construir un archivo documental, fotográfico e histórico digital, accesible y catalogado de manera profesional.
              </p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: '#fffbeb', 
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={24} />
              </div>
              <h3 className="card-title">Futuras Producciones</h3>
              <p style={{ fontSize: '0.95rem', margin: 0 }}>
                El material servirá de base para un libro impreso, un e-book digital, material educativo y un futuro museo virtual.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacidad y Confianza */}
      <section className="section" style={{ backgroundColor: 'var(--neutral-grey-light)', borderTop: '1px solid var(--border-warm)', borderBottom: '1px solid var(--border-warm)' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--border-warm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--hope-green-light)', 
                color: 'var(--hope-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Consentimiento y Privacidad Garantizada</h2>
            </div>
            
            <p style={{ fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              El Proyecto Memoria Viva Pico Truncado trata todos los materiales aportados con el máximo respeto y de forma <strong>privada por defecto</strong>. Ningún material será publicado automáticamente. Toda incorporación pasa por la revisión humana del equipo responsable y se apega estrictamente a la autorización concedida por cada vecino.
            </p>

            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--hope-green)', fontWeight: 'bold' }}>✓</span>
                <span style={{ fontSize: '0.9rem' }}>Tú decides el nivel de autorización (desde uso público total hasta archivo interno restringido).</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--hope-green)', fontWeight: 'bold' }}>✓</span>
                <span style={{ fontSize: '0.9rem' }}>Tú decides cómo figurar en los créditos (nombre, iniciales, familia o anónimo).</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--hope-green)', fontWeight: 'bold' }}>✓</span>
                <span style={{ fontSize: '0.9rem' }}>Los archivos se resguardan de forma segura en un bucket privado protegido.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--hope-green)', fontWeight: 'bold' }}>✓</span>
                <span style={{ fontSize: '0.9rem' }}>Firma de consentimiento digital y trazabilidad transparente de cada aporte.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-warm)' }}>
              <Link href="/privacidad" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Leer texto legal y políticas de privacidad
              </Link>
              <Link href="/aportar" className="btn btn-green btn-sm">
                Aportar ahora con seguridad
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Invitación */}
      <section className="section" style={{ backgroundColor: 'var(--white)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>¿Tienes fotos, documentos o recuerdos familiares?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Cada pequeño aporte ayuda a reconstruir el gran rompecabezas de nuestra historia local. Sumá tu testimonio o el de tus abuelos, padres o instituciones a las que pertenecés.
          </p>
          <Link href="/aportar" className="btn btn-primary">
            Comenzar a cargar mi aporte
          </Link>
        </div>
      </section>
    </div>
  );
}
