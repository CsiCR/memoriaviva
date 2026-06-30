'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, BookOpen } from 'lucide-react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/proyecto', label: 'El Proyecto' },
    { href: '/aportar', label: 'Aportar una Memoria' },
    { href: '/privacidad', label: 'Privacidad' },
  ];

  return (
    <header className="site-header">
      <div className="container header-container">
        <Link href="/" className="site-logo" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/icon-192.png" alt="Logo Cerro Pico Truncado" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
          <span>Memoria Viva</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" style={{ display: 'block' }}>
          <ul className="site-nav-list">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`site-nav-link ${isActive ? 'active' : ''}`}
                    style={{
                      fontWeight: isActive ? '600' : '400',
                      borderBottom: isActive ? '2px solid var(--primary-blue)' : 'none',
                      paddingBottom: '0.25rem',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/admin/login" className="btn btn-outline btn-sm">
                Panel Interno
              </Link>
            </li>
          </ul>
        </nav>

        {/* Mobile menu button */}
        <button
          className="mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Abrir menú"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
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
  );
}
