import Link from 'next/link';
import { CheckCircle, ArrowLeft, Plus } from 'lucide-react';

export default function Gracias() {
  return (
    <div className="container section" style={{ maxWidth: '600px', textAlign: 'center', marginTop: '2rem' }}>
      <div style={{ 
        display: 'inline-flex', 
        backgroundColor: 'var(--hope-green-light)', 
        color: 'var(--hope-green)', 
        padding: '1.25rem', 
        borderRadius: '50%',
        marginBottom: '1.5rem'
      }}>
        <CheckCircle size={48} />
      </div>
      
      <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>¡Muchas gracias por tu aporte!</h1>
      
      <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
        Hemos recibido tu material e información de contacto de forma segura. El equipo editorial de <strong>Memoria Viva Pico Truncado</strong> revisará tu aporte respetando rigurosamente el nivel de consentimiento y la preferencia de créditos que seleccionaste.
      </p>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'left', backgroundColor: 'var(--white)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>¿Qué sucede ahora?</h3>
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <li>El aporte ingresa al panel en estado <strong>Recibido</strong>.</li>
          <li>Un validador histórico del equipo revisará la descripción, fecha y personas mencionadas.</li>
          <li>Si autorizaste a ser contactado, es posible que te enviemos un mensaje de WhatsApp o correo electrónico para ampliar la historia o coordinar una entrevista grabada.</li>
          <li>El material será archivado digitalmente y quedará catalogado para su posible publicación en el libro u otros medios autorizados.</li>
        </ol>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Volver al inicio
        </Link>
        <Link href="/aportar" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Aportar otro material
        </Link>
      </div>
    </div>
  );
}
