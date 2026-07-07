import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-section">
          <h4>Memoria Viva Pico Truncado</h4>
          <p style={{ marginBottom: '1rem' }}>
            Una iniciativa colaborativa enfocada en la preservación del patrimonio, la identidad y la memoria histórica de nuestra localidad.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#a0aec0' }}>
            Impulsado por Edith Gómez junto al Centro Chileno de Pico Truncado y Adrián Montet, en representación de la Unión Vecinal Barrio YPF.
          </p>
        </div>

        <div className="footer-section">
          <h4>Enlaces Rápidos</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <Link href="/" style={{ color: '#a0aec0' }}>Inicio</Link>
            </li>
            <li>
              <Link href="/proyecto" style={{ color: '#a0aec0' }}>El Proyecto</Link>
            </li>
            <li>
              <Link href="/aportar" style={{ color: '#a0aec0' }}>Aportar una Memoria</Link>
            </li>
            <li>
              <Link href="/quiero-formar-parte" style={{ color: '#a0aec0' }}>Quiero formar parte</Link>
            </li>
            <li>
              <Link href="/privacidad" style={{ color: '#a0aec0' }}>Política de Privacidad</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contacto Institucional</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#a0aec0' }}>
            <strong>Email:</strong> Memoriavivapicotruncado@gmail.com
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#a0aec0' }}>
            <strong>Lugar:</strong> Unión Vecinal Barrio YPF
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#a0aec0' }}>
            Pico Truncado, Santa Cruz, Argentina
          </p>
        </div>
      </div>

      <div className="container">
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Proyecto Memoria Viva Pico Truncado. Todos los derechos reservados.</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#718096' }}>
            Preservando la historia de nuestras familias, instituciones y vecinos.
          </p>
        </div>
      </div>
    </footer>
  );
}
