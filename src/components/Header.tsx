'use client';

// Componente Header Principal del Portal (Portal Memoria Viva)
// Archivo: src/components/Header.tsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { clientEnv } from '@/lib/config/env';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  const showStagingBanner = clientEnv.NEXT_PUBLIC_APP_ENV === "staging";
  const showBetaBanner = clientEnv.NEXT_PUBLIC_SHOW_BETA_BANNER;

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsScrolled(true);
      return;
    }

    // Inicializar scroll al montar
    setIsScrolled(window.scrollY > 50);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHome]);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/proyecto', label: 'El Proyecto' },
    { href: '/aportar', label: 'Aportar una Memoria' },
    { href: '/quiero-formar-parte', label: 'Quiero formar parte' },
  ];

  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    width: '100%',
    zIndex: 100,
    transition: 'background-color 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease',
    backgroundColor: isHome
      ? (isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent')
      : 'var(--white)',
    backdropFilter: (isHome && isScrolled) ? 'blur(8px)' : 'none',
    borderBottom: isHome
      ? (isScrolled ? '1px solid var(--border-warm)' : '1px solid transparent')
      : '1px solid var(--border-warm)',
    boxShadow: (isHome && isScrolled) ? 'var(--shadow-sm)' : 'none',
  };

  return (
    <>
      {showStagingBanner && (
        <div 
          id="staging-warning-banner"
          style={{ 
            backgroundColor: '#d97706', 
            color: '#ffffff', 
            padding: '0.5rem 1rem', 
            textAlign: 'center', 
            fontSize: '0.9rem', 
            fontWeight: 600, 
            letterSpacing: '0.5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          ⚠️ Entorno de Prueba y Revisión Interna — Memoria Viva Pico Truncado
        </div>
      )}
      {showBetaBanner && (
        <div 
          id="beta-version-banner"
          style={{ 
            backgroundColor: 'var(--primary-blue)', 
            color: '#ffffff', 
            padding: '0.5rem 1rem', 
            textAlign: 'center', 
            fontSize: '0.9rem', 
            fontWeight: 500,
            letterSpacing: '0.3px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          Versión inicial del Archivo Histórico Digital. Seguimos incorporando historias y mejorando la experiencia.
        </div>
      )}
      <header className="site-header" style={headerStyle}>
        <div className="container header-container">
          <Link 
            href="/" 
            className="site-logo" 
            onClick={closeMenu} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: (isHome && !isScrolled) ? '#FAFAF5' : 'var(--primary-blue)',
              transition: 'color 0.4s ease',
            }}
          >
            <img src="/icon-192.png" alt="Logo Cerro Pico Truncado" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
            <span>Memoria Viva</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" style={{ display: 'block' }}>
            <ul className="site-nav-list">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const linkColor = (isHome && !isScrolled)
                  ? (isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)')
                  : (isActive ? 'var(--primary-blue)' : 'var(--text-secondary)');
                const activeBorder = isActive
                  ? ((isHome && !isScrolled) ? '2px solid #ffffff' : '2px solid var(--primary-blue)')
                  : 'none';
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`site-nav-link ${isActive ? 'active' : ''}`}
                      style={{
                        fontWeight: isActive ? '600' : '400',
                        borderBottom: activeBorder,
                        paddingBottom: '0.25rem',
                        color: linkColor,
                        transition: 'color 0.4s ease, border-color 0.4s ease',
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link 
                  href="/admin/login" 
                  className="btn btn-outline btn-sm"
                  style={{
                    transition: 'all 0.4s ease',
                    ...(isHome && !isScrolled
                      ? { borderColor: 'rgba(255, 255, 255, 0.5)', color: '#ffffff', backgroundColor: 'transparent' }
                      : {})
                  }}
                >
                  Panel Interno
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={toggleMenu}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: (isHome && !isScrolled) ? '#ffffff' : 'var(--text-primary)',
              transition: 'color 0.4s ease',
              display: 'none', // Overridden in media queries
            }}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        {isOpen && (
          <nav
            className="mobile-nav"
            style={{
              position: 'absolute',
              top: '4.5rem',
              left: 0,
              width: '100%',
              backgroundColor: 'var(--white)',
              borderBottom: '1px solid var(--border-warm)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              zIndex: 99,
            }}
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  style={{
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? 'var(--primary-blue)' : 'var(--text-secondary)',
                    fontSize: '1.1rem',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/admin/login"
              onClick={closeMenu}
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Panel Interno
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
