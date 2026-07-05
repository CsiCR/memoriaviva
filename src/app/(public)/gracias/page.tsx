import Link from 'next/link';
import { CheckCircle, ArrowLeft, Plus, Heart } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function Gracias({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const isRegistration = resolvedParams.source === 'quiero-formar-parte';

  return (
    <div className="container section" style={{ maxWidth: '600px', textAlign: 'center', marginTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ 
        display: 'inline-flex', 
        backgroundColor: isRegistration ? '#f0f9ff' : 'var(--hope-green-light)', 
        color: isRegistration ? '#0284c7' : 'var(--hope-green)', 
        padding: '1.25rem', 
        borderRadius: '50%',
        marginBottom: '1.5rem'
      }}>
        {isRegistration ? <Heart size={48} /> : <CheckCircle size={48} />}
      </div>
      
      {isRegistration ? (
        <>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            ¡Bienvenido!
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.6, marginBottom: '1rem' }}>
            Desde este momento ya sos parte de Memoria Viva Pico Truncado.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            A partir de hoy podremos construir juntos la historia de nuestra ciudad.
          </p>
          <p style={{ fontSize: '1.15rem', color: '#0284c7', fontWeight: 700, fontStyle: 'italic', marginBottom: '2.5rem' }}>
            Tu historia recién comienza.
          </p>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'left', backgroundColor: 'var(--white)', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#0f172a', fontWeight: 600 }}>¿Qué sucede ahora?</h3>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>Tu registro de aportante fue cargado de manera segura en nuestro Panel Editorial.</li>
              <li>Un entrevistador de nuestro equipo revisará tus datos y tu comentario inicial.</li>
              <li>Nos pondremos en contacto contigo por WhatsApp o e-mail para coordinar un encuentro, charlar en detalle o programar la digitalización de fotos o documentos familiares si deseas compartirlos.</li>
            </ol>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>¡Muchas gracias por tu aporte!</h1>
          
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Hemos recibido tu material e información de contacto de forma segura. El equipo editorial de <strong>Memoria Viva Pico Truncado</strong> revisará tu aporte respetando rigurosamente el nivel de consentimiento y la preferencia de créditos que seleccionaste.
          </p>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'left', backgroundColor: 'var(--white)', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>¿Qué sucede ahora?</h3>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>El aporte ingresa al panel en estado <strong>Recibido</strong>.</li>
              <li>Un validador histórico del equipo revisará la descripción, fecha y personas mencionadas.</li>
              <li>Si autorizaste a ser contactado, es posible que te enviemos un mensaje de WhatsApp o correo electrónico para ampliar la historia o coordinar una entrevista grabada.</li>
              <li>El material será archivado digitalmente y quedará catalogado para su posible publicación en el libro u otros medios autorizados.</li>
            </ol>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Volver al inicio
        </Link>
        {isRegistration ? (
          <Link href="/aportar" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Compartir un recuerdo o foto
          </Link>
        ) : (
          <Link href="/aportar" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Aportar otro material
          </Link>
        )}
      </div>
    </div>
  );
}
