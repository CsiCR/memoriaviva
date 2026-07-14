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

// Caché a nivel de módulo para evitar llamadas REST duplicadas en la misma página
let cachedOptionsPromise: Promise<any> | null = null;
const fetchAllOptions = () => {
  if (!cachedOptionsPromise) {
    cachedOptionsPromise = fetch('/api/select-options')
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener opciones');
        return res.json();
      })
      .catch(err => {
        console.error('Error fetching select options in EditorialHelp:', err);
        cachedOptionsPromise = null; // Reintentar en la próxima carga si falló
        return null;
      });
  }
  return cachedOptionsPromise;
};

export default function EditorialHelp({
  helpKey,
  initialSelectedValue,
  className = ''
}: EditorialHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string>('');
  const [dbOption, setDbOption] = useState<any>(null);
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Determinar la categoría principal y la clave activa inicial
  const isStatus = helpKey === 'editorialStatus';
  const isLevel = helpKey === 'authorizationLevel';
  const isCredit = helpKey === 'creditPreference';
  const isIndicator = helpKey.startsWith('indicators.');
  const isPublication = helpKey.startsWith('publication.');

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
      if (isStatus) setActiveKey('received');
      else if (isLevel) setActiveKey('A');
      else if (isCredit) setActiveKey('full_name');
    }

    if (isIndicator) {
      const indicatorKey = helpKey.split('.')[1];
      setActiveKey(indicatorKey || '');
    } else if (isPublication) {
      const publicationKey = helpKey.split('.')[1];
      setActiveKey(publicationKey || '');
    }
  }, [initialSelectedValue, helpKey, isStatus, isLevel, isCredit, isIndicator, isPublication]);

  // Cargar detalles de la base de datos cuando el popover se abra
  useEffect(() => {
    if (!isOpen || activeKey === '') return;

    const loadDbDetails = async () => {
      const allOpts = await fetchAllOptions();
      if (!allOpts) return;

      let matched = null;
      if (isLevel) {
        matched = allOpts.authorization_level?.find((o: any) => o.value === activeKey);
      } else if (isCredit) {
        const valMap: Record<string, string> = {
          'full_name': 'Nombre completo',
          'initials': 'Solo iniciales',
          'anonymous': 'Anónimo'
        };
        const dbVal = valMap[activeKey] || activeKey;
        matched = allOpts.credit_preference?.find((o: any) => o.value === dbVal || o.name === dbVal);
      } else if (isIndicator) {
        matched = allOpts.editorial_indicator?.find((o: any) => o.code === activeKey);
      } else if (isPublication) {
        matched = allOpts.publication_status?.find((o: any) => o.code === activeKey);
      }

      setDbOption(matched || null);
    };

    loadDbDetails();
  }, [isOpen, activeKey, isLevel, isCredit, isIndicator, isPublication]);

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
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
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
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  };

  // Obtener el contenido de ayuda local de fallback
  let fallbackContent: HelpContent | undefined;
  if (isStatus) {
    fallbackContent = editorialHelp.editorialStatus[activeKey];
  } else if (isLevel) {
    fallbackContent = editorialHelp.authorizationLevel[activeKey];
  } else if (isCredit) {
    fallbackContent = editorialHelp.creditPreference[activeKey];
  } else if (isIndicator) {
    fallbackContent = editorialHelp.indicators[activeKey];
  } else if (isPublication) {
    // Si no está definido localmente, fallback vacío
    const pubHelp = (editorialHelp as any).publication || {};
    fallbackContent = pubHelp[activeKey];
  }

  // Mezclar textos: priorizar base de datos viva, luego fallback del config local
  const displayTitle = dbOption?.name || fallbackContent?.title || activeKey;
  const displayDescription = dbOption?.description || fallbackContent?.description || 'Sin descripción disponible.';
  
  // Indicadores específicos
  const whenToUse = dbOption?.metadata?.activation_criteria || fallbackContent?.whenToUse;
  const howToResolve = dbOption?.metadata?.resolution_instructions || fallbackContent?.howToResolve;
  
  // Estados de publicación específicos
  const conditions = dbOption?.metadata?.minimum_conditions 
    ? [dbOption.metadata.minimum_conditions] 
    : (fallbackContent?.conditions || []);

  const whyExists = fallbackContent?.whyExists || dbOption?.description || 'Requisito del sistema para la gestión del patrimonio histórico.';

  // Generar ID único para vinculación ARIA
  const popoverId = `editorial-help-popover-${helpKey.replace(/\./g, '-')}`;
  const triggerAriaLabel = `Ayuda para ${
    isStatus ? 'Estado Editorial' : isLevel ? 'Nivel de Autorización' : isCredit ? 'Preferencia de Crédito' : 'Campo Editorial'
  }`;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }} className={className}>
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
          <div className="help-popover-backdrop" onClick={closePopover} />

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
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

            {/* Aviso de navegación informativa */}
            {(isStatus || isLevel || isCredit || isPublication) && (
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

            {/* Selector de navegación para estados editoriales */}
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

            {/* Tabs para niveles de autorización */}
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

            {/* Tabs para preferencias de créditos */}
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

            {/* Contenido Documental Seguro (sin HTML arbitrario) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '280px', paddingRight: '2px' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                  {displayTitle}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {displayDescription}
                </p>
              </div>

              {fallbackContent?.details && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  <strong>Alcance:</strong> {fallbackContent.details}
                </div>
              )}

              {/* Condiciones mínimas para estados de publicación */}
              {conditions && conditions.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--hope-green)', display: 'block', marginBottom: '0.2rem' }}>
                    Requisitos y Condiciones
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {conditions.map((cond, idx) => (
                      <li key={idx} style={{ marginBottom: '2px', listStyleType: 'square' }}>{cond}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Criterios e instrucciones de resolución para indicadores */}
              {whenToUse && (
                <div>
                  <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Criterio de Activación:</strong>
                  <span style={{ fontSize: '0.8rem' }}>{whenToUse}</span>
                </div>
              )}

              {howToResolve && (
                <div style={{ marginTop: '0.25rem' }}>
                  <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cómo resolverlo:</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary-blue-hover)', fontWeight: 500 }}>{howToResolve}</span>
                </div>
              )}

              {fallbackContent?.permissions && (
                <div style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '4px', color: '#166534' }}>
                  <strong>Permisos:</strong> {fallbackContent.permissions}
                </div>
              )}

              {fallbackContent?.restrictions && (
                <div style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', color: '#991b1b' }}>
                  <strong>Restricciones:</strong> {fallbackContent.restrictions}
                </div>
              )}

              {/* Bloque: ¿Por qué existe este campo? */}
              {whyExists && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-grey)', display: 'block', marginBottom: '2px' }}>
                    ¿Por qué existe este campo?
                  </span>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {whyExists}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
