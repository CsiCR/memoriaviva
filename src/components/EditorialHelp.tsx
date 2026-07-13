'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Info, X, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import {
  editorialHelp,
  statusToKeyMap,
  levelToKeyMap,
  creditToKeyMap,
  HelpContent
} from '@/config/editorialHelp';

interface EditorialHelpProps {
  helpKey: 'editorialStatus' | 'authorizationLevel' | 'creditPreference' | string;
  initialSelectedValue?: string;
  className?: string;
}

export default function EditorialHelp({
  helpKey,
  initialSelectedValue,
  className = ''
}: EditorialHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string>('');
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Determinar la categoría principal y la clave activa inicial
  const isStatus = helpKey === 'editorialStatus';
  const isLevel = helpKey === 'authorizationLevel';
  const isCredit = helpKey === 'creditPreference';
  const isIndicator = helpKey.startsWith('indicators.');

  useEffect(() => {
    if (initialSelectedValue) {
      if (isStatus) {
        setActiveKey(statusToKeyMap[initialSelectedValue] || 'received');
      } else if (isLevel) {
        setActiveKey(levelToKeyMap[initialSelectedValue] || 'A');
      } else if (isCredit) {
        setActiveKey(creditToKeyMap[initialSelectedValue] || 'full_name');
      }
    } else {
      // Claves por defecto si no hay valor inicial
      if (isStatus) setActiveKey('received');
      else if (isLevel) setActiveKey('A');
      else if (isCredit) setActiveKey('full_name');
    }

    if (isIndicator) {
      const indicatorKey = helpKey.split('.')[1];
      setActiveKey(indicatorKey || '');
    }
  }, [initialSelectedValue, helpKey, isStatus, isLevel, isCredit, isIndicator]);

  // Cierre con Escape y click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopover();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closePopover();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Manejo de foco (Focus Trap & Return)
  useEffect(() => {
    if (isOpen) {
      // Retrasar levemente para permitir el renderizado
      const focusTimeout = setTimeout(() => {
        if (popoverRef.current) {
          const focusable = popoverRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex="0"]'
          );
          if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
          }
        }
      }, 50);
      return () => clearTimeout(focusTimeout);
    }
  }, [isOpen]);

  // Trap Focus de teclado
  const handleKeyDownTrap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !popoverRef.current) return;

    const focusableElements = popoverRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex="0"]'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  const togglePopover = () => {
    if (isOpen) {
      closePopover();
    } else {
      setIsOpen(true);
    }
  };

  const closePopover = () => {
    setIsOpen(false);
    // Retornar el foco al botón disparador
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  };

  // Obtener el contenido de ayuda según la categoría activa
  let content: HelpContent | undefined;
  if (isStatus) {
    content = editorialHelp.editorialStatus[activeKey];
  } else if (isLevel) {
    content = editorialHelp.authorizationLevel[activeKey];
  } else if (isCredit) {
    content = editorialHelp.creditPreference[activeKey];
  } else if (isIndicator) {
    content = editorialHelp.indicators[activeKey];
  }

  // Generar ID único para vinculación ARIA
  const popoverId = `editorial-help-popover-${helpKey.replace(/\./g, '-')}`;
  const triggerAriaLabel = `Ayuda contextual para ${
    isStatus ? 'Estado Editorial' : isLevel ? 'Nivel de Autorización' : isCredit ? 'Preferencia de Crédito' : 'Indicador'
  }`;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }} className={className}>
      {/* Estilos responsivos inyectados */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .help-popover-container {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            width: 100vw !important;
            max-width: 100vw !important;
            border-radius: 16px 16px 0 0 !important;
            box-shadow: 0 -10px 25px rgba(0,0,0,0.15) !important;
            animation: slideUpHelp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            margin: 0 !important;
            z-index: 1000 !important;
            padding-bottom: 2rem !important;
          }
          .help-popover-backdrop {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(15, 23, 42, 0.4) !important;
            backdrop-filter: blur(2px) !important;
            z-index: 999 !important;
          }
        }
        @keyframes slideUpHelp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />

      <button
        ref={triggerRef}
        type="button"
        onClick={togglePopover}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={triggerAriaLabel}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          color: 'var(--primary-blue)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s',
          borderRadius: '4px',
          outline: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary-blue-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--primary-blue)'; }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(21, 136, 230, 0.3)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Info size={16} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop para móviles */}
          <div className="help-popover-backdrop" onClick={closePopover} />

          {/* Panel Popover */}
          <div
            id={popoverId}
            ref={popoverRef}
            onKeyDown={handleKeyDownTrap}
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '8px',
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '1.25rem',
              zIndex: 500,
              fontSize: '0.85rem',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
            className="help-popover-container"
          >
            {/* Header del Popover */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-headings)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
                <HelpCircle size={16} />
                Manual Editorial Contextual
              </span>
              <button
                type="button"
                onClick={closePopover}
                aria-label="Cerrar ayuda"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Aviso Informativo de Navegación */}
            {(isStatus || isLevel || isCredit) && (
              <div style={{
                backgroundColor: 'var(--primary-blue-light)',
                border: '1px solid rgba(21, 136, 230, 0.15)',
                color: 'var(--primary-blue-hover)',
                padding: '0.5rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.35rem',
                fontWeight: 500
              }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>Navegar esta ayuda es informativo y no modifica el valor del formulario.</span>
              </div>
            )}

            {/* Selectores de Navegación Interna (Tabs o Dropdowns) */}
            {isStatus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label htmlFor="help-status-select" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Seleccionar estado para ver documentación:
                </label>
                <select
                  id="help-status-select"
                  value={activeKey}
                  onChange={(e) => setActiveKey(e.target.value)}
                  className="form-select"
                  style={{
                    height: '32px',
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  {Object.entries(editorialHelp.editorialStatus).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.title} {key === statusToKeyMap[initialSelectedValue || ''] ? '(Seleccionado)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLevel && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {Object.keys(editorialHelp.authorizationLevel).map((key) => {
                  const isActive = activeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveKey(key)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: isActive ? 'var(--primary-blue)' : 'var(--border-color)',
                        backgroundColor: isActive ? 'var(--primary-blue-light)' : 'transparent',
                        color: isActive ? 'var(--primary-blue)' : 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Nivel {key}
                    </button>
                  );
                })}
              </div>
            )}

            {isCredit && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {Object.entries(editorialHelp.creditPreference).map(([key, val]) => {
                  const isActive = activeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveKey(key)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: isActive ? 'var(--primary-blue)' : 'var(--border-color)',
                        backgroundColor: isActive ? 'var(--primary-blue-light)' : 'transparent',
                        color: isActive ? 'var(--primary-blue)' : 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {val.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Contenido Documental */}
            {content && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '280px', paddingRight: '2px' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    {content.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {content.description}
                  </p>
                </div>

                {/* Detalles para niveles de autorización */}
                {content.details && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    <strong>Alcance:</strong> {content.details}
                  </div>
                )}

                {/* Condiciones para estados */}
                {content.conditions && content.conditions.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--hope-green)', display: 'block', marginBottom: '0.2rem' }}>
                      Requisitos y Condiciones
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {content.conditions.map((cond, idx) => (
                        <li key={idx} style={{ marginBottom: '2px', listStyleType: 'square' }}>{cond}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tareas pendientes para estados */}
                {content.missing && content.missing.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#b45309', display: 'block', marginBottom: '0.2rem' }}>
                      Habitualmente falta
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {content.missing.map((mis, idx) => (
                        <li key={idx} style={{ marginBottom: '2px', listStyleType: 'disc' }}>{mis}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Próximo paso para estados */}
                {content.nextStep && (
                  <div style={{ fontSize: '0.8rem', backgroundColor: '#fafaf6', border: '1px dashed var(--border-warm)', padding: '0.4rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <strong style={{ color: 'var(--neutral-grey)' }}>Paso sugerido:</strong>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{content.nextStep}</span>
                  </div>
                )}

                {/* Permisos y restricciones para niveles */}
                {content.permissions && (
                  <div style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '4px', color: '#166534' }}>
                    <strong>Permisos:</strong> {content.permissions}
                  </div>
                )}
                {content.restrictions && (
                  <div style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', color: '#991b1b' }}>
                    <strong>Restricciones:</strong> {content.restrictions}
                  </div>
                )}

                {/* Significado para preferencias */}
                {content.significance && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderLeft: '3px solid var(--primary-blue)', paddingLeft: '0.5rem', fontStyle: 'italic' }}>
                    {content.significance}
                  </div>
                )}

                {/* Indicadores: cuándo y cómo */}
                {content.whenToUse && (
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cuándo corresponde:</strong>
                    <span style={{ fontSize: '0.8rem' }}>{content.whenToUse}</span>
                  </div>
                )}
                {content.howToResolve && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cómo resolverlo:</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-blue-hover)' }}>{content.howToResolve}</span>
                  </div>
                )}

                {/* SECCIÓN INTERNA: ¿Por qué existe este campo? */}
                {content.whyExists && (
                  <div style={{
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-color)',
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-grey)', display: 'block', marginBottom: '2px' }}>
                      ¿Por qué existe este campo?
                    </span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {content.whyExists}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </span>
  );
}
