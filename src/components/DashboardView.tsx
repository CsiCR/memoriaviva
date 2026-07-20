/* eslint-disable @typescript-eslint/no-explicit-any */
// Componente de Cliente Interactivo para el Dashboard Editorial
// Archivo: src/components/DashboardView.tsx

"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  BarChart2, 
  ArrowLeft, 
  Filter, 
  Calendar, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  FileText, 
  Sliders
} from 'lucide-react';
import { 
  evaluateDashboard, 
  EvaluatedContribution, 
  DashboardFilter 
} from '@/lib/editorial/dashboard';
import { STAGES } from '@/lib/editorial/progress/progressConstants';

interface DashboardViewProps {
  evaluatedContributions: EvaluatedContribution[];
}

export default function DashboardView({ evaluatedContributions }: DashboardViewProps) {
  // 1. Estados para los filtros
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [timelineMode, setTimelineMode] = useState<"received" | "updated" | "published">('received');
  const [contentType, setContentType] = useState<string>('');
  const [editorialStatus, setEditorialStatus] = useState<string>('');
  const [publicationStatus, setPublicationStatus] = useState<string>('');
  const [authorizationLevel, setAuthorizationLevel] = useState<string>('');
  const [progressMin, setProgressMin] = useState<string>('');
  const [progressMax, setProgressMax] = useState<string>('');
  const [stage, setStage] = useState<string>('');
  const [hasEditorialIntervention, setHasEditorialIntervention] = useState<string>('all');
  const [indicatorCode, setIndicatorCode] = useState<string>('');
  const [bottleneckCode, setBottleneckCode] = useState<string>('');

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // 2. Construir objeto de filtros
  const filter: DashboardFilter = useMemo(() => {
    return {
      dateStart: dateStart || null,
      dateEnd: dateEnd || null,
      timelineMode,
      contentType: contentType || null,
      editorialStatus: editorialStatus || null,
      publicationStatus: publicationStatus || null,
      authorizationLevel: authorizationLevel || null,
      progressMin: progressMin ? parseInt(progressMin, 10) : null,
      progressMax: progressMax ? parseInt(progressMax, 10) : null,
      stage: stage || null,
      hasEditorialIntervention: hasEditorialIntervention === 'yes' 
        ? true 
        : hasEditorialIntervention === 'no' 
          ? false 
          : null,
      indicatorCode: indicatorCode || null,
      bottleneckCode: bottleneckCode || null
    };
  }, [
    dateStart, dateEnd, timelineMode, contentType, editorialStatus, publicationStatus, 
    authorizationLevel, progressMin, progressMax, stage, hasEditorialIntervention, 
    indicatorCode, bottleneckCode
  ]);

  // 3. Evaluar Dashboard una única vez por cada ciclo de cambio de filtros
  const result = useMemo(() => {
    return evaluateDashboard(evaluatedContributions, filter);
  }, [evaluatedContributions, filter]);

  // 4. Limpiar todos los filtros
  const handleClearFilters = () => {
    setDateStart('');
    setDateEnd('');
    setTimelineMode('received');
    setContentType('');
    setEditorialStatus('');
    setPublicationStatus('');
    setAuthorizationLevel('');
    setProgressMin('');
    setProgressMax('');
    setStage('');
    setHasEditorialIntervention('all');
    setIndicatorCode('');
    setBottleneckCode('');
  };

  // 5. SVG Timeline Line Chart Builder
  const renderTimelineChart = () => {
    const timelineData = result.timeline;
    if (timelineData.length === 0) {
      return (
        <div style={{ display: 'flex', height: '160px', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          Sin datos para el período seleccionado
        </div>
      );
    }

    const width = 500;
    const height = 140;
    const padding = 25;
    const maxCount = Math.max(...timelineData.map(t => t.count), 1);
    
    // Generar los puntos del SVG
    const points = timelineData.map((d, index) => {
      const x = padding + (index / Math.max(timelineData.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (d.count / maxCount) * (height - padding * 2);
      return { x, y, label: d.period, count: d.count };
    });

    const pathD = points.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '400px', height: '100%', maxHeight: '180px' }}>
          {/* Cuadrícula horizontal de fondo */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            return (
              <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
            );
          })}

          {/* Línea principal */}
          {points.length > 1 && (
            <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Círculos e interacciones sobre puntos */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" style={{ cursor: 'pointer' }} />
              
              {/* Valor encima del punto */}
              <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="700" fill="#0f172a" textAnchor="middle">
                {p.count}
              </text>
              
              {/* Etiqueta del período (X Axis) */}
              <text x={p.x} y={height - 5} fontSize="8" fontWeight="600" fill="#64748b" textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#0284c7',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              <ArrowLeft size={16} /> Inicio
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Dashboard Editorial</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Tablero de Gestión Editorial
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Indicadores, métricas agregadas y cuellos de botella en tiempo real de la colección.
          </p>
        </div>

        <button 
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            backgroundColor: isFilterPanelOpen ? '#cbd5e1' : '#1e293b',
            color: isFilterPanelOpen ? '#0f172a' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Filter size={16} /> {isFilterPanelOpen ? 'Ocultar Filtros' : 'Filtrar Datos'}
        </button>
      </div>

      {/* Panel de Filtros Interactivos */}
      {isFilterPanelOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={16} style={{ color: '#0ea5e9' }} /> Filtros de Colección
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            {/* Rango de Fechas */}
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Desde (Fecha)</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
            </div>
            
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Hasta (Fecha)</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Criterio Temporal</label>
              <select value={timelineMode} onChange={e => setTimelineMode(e.target.value as any)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                <option value="received">Fecha de Recepción</option>
                <option value="updated">Fecha de Modificación</option>
                <option value="published">Fecha de Publicación</option>
              </select>
            </div>

            {/* Tipo de Contenido */}
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Tipo de Aporte</label>
              <select value={contentType} onChange={e => setContentType(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                <option value="">Todos los tipos</option>
                <option value="textual">Testimonio Escrito</option>
                <option value="documentary">Fotografía o Documento</option>
                <option value="audiovisual">Audio o Video</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            {/* Etapa del Progreso */}
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Etapa Editorial</label>
              <select value={stage} onChange={e => setStage(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                <option value="">Todas las etapas</option>
                {Object.values(STAGES).map(s => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Progreso Rango */}
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Progreso Mínimo %</label>
              <input type="number" min="0" max="100" value={progressMin} onChange={e => setProgressMin(e.target.value)} placeholder="0" style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Progreso Máximo %</label>
              <input type="number" min="0" max="100" value={progressMax} onChange={e => setProgressMax(e.target.value)} placeholder="100" style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
            </div>

            {/* Intervención Editorial */}
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Intervención Editorial</label>
              <select value={hasEditorialIntervention} onChange={e => setHasEditorialIntervention(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                <option value="all">Todas</option>
                <option value="yes">Con Intervención (Editado)</option>
                <option value="no">Sin Intervención (Recibido Limpio)</option>
              </select>
            </div>

            {/* Cuello de botella */}
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Bloqueo Activo</label>
              <select value={bottleneckCode} onChange={e => setBottleneckCode(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                <option value="">Ninguno</option>
                <option value="CONSENT">Falta Consentimiento</option>
                <option value="FILES">Faltan Archivos Útiles</option>
                <option value="HISTORICAL_VAL">Validación Histórica Rechazada</option>
                <option value="INDICATORS">Indicadores Críticos Activos</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              onClick={handleClearFilters}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Reestablecer Filtros
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Inteligente (Recomendaciones hoy) */}
      {result.smartActions.length > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💡</span> Tareas Sugeridas Hoy para el Equipo Editorial
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {result.smartActions.map(action => (
              <div key={action.code} style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${action.severity === 'critical' ? '#fecaca' : action.severity === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <span style={{
                  fontSize: '1.25rem',
                  backgroundColor: action.severity === 'critical' ? '#fef2f2' : action.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                  padding: '0.35rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {action.severity === 'critical' ? '🚨' : action.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{action.title}</strong>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      backgroundColor: action.severity === 'critical' ? '#fee2e2' : action.severity === 'warning' ? '#fef3c7' : '#e0f2fe',
                      color: action.severity === 'critical' ? '#991b1b' : action.severity === 'warning' ? '#92400e' : '#0369a1',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      {action.affectedCount} aportes
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid General de Tarjetas KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Tarjeta 1: Estado General */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: '#0ea5e9' }} /> Estado General del Proyecto
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Total Aportes</span>
              <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{result.totalContributions}</strong>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Avance Promedio</span>
              <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{result.averageProgress}%</strong>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Elegibles (v3.0)</span>
              <strong style={{ fontSize: '1.25rem', color: '#16a34a' }}>{result.eligibleCount}</strong>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Publicados</span>
              <strong style={{ fontSize: '1.25rem', color: '#2563eb' }}>{result.publishedCount}</strong>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Bloqueados</span>
              <strong style={{ fontSize: '1.25rem', color: '#dc2626' }}>{result.blockedCount}</strong>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Por Procesar</span>
              <strong style={{ fontSize: '1.25rem', color: '#d97706' }}>{result.pendingReviewCount}</strong>
            </div>
          </div>
        </div>

        {/* Tarjeta 11: Salud Editorial */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} style={{ color: '#10b981' }} /> Salud Editorial del Archivo
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #dcfce7' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Círculo SVG de progreso de salud */}
              <svg width="60" height="60" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={result.editorialHealth.healthScore >= 80 ? '#10b981' : result.editorialHealth.healthScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="3" 
                  strokeDasharray={`${result.editorialHealth.healthScore} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <span style={{ position: 'absolute', fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                {result.editorialHealth.healthScore}%
              </span>
            </div>
            
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>CALIDAD DE ARCHIVO</span>
              <strong style={{ fontSize: '1.2rem', color: result.editorialHealth.healthScore >= 80 ? '#15803d' : result.editorialHealth.healthScore >= 50 ? '#b45309' : '#b91c1c' }}>
                {result.editorialHealth.label}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Aportes con Bloqueos:</span>
              <strong style={{ color: '#dc2626' }}>{result.editorialHealth.blockedPercentage}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Aportes con Advertencias:</span>
              <strong style={{ color: '#d97706' }}>{result.editorialHealth.warningPercentage}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Progreso Promedio de la Muestra:</span>
              <strong style={{ color: '#0f172a' }}>{result.editorialHealth.averageProgress}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Elegibles Sin Publicar:</span>
              <strong style={{ color: '#2563eb' }}>{result.editorialHealth.publishablePercentage}%</strong>
            </div>
          </div>
        </div>

        {/* Tarjeta 6: Productividad Editorial */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: '#8b5cf6' }} /> Productividad Editorial
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Promedio de Progreso:</span>
              <strong style={{ color: '#0f172a' }}>{result.productivity.average}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Mediana:</span>
              <strong style={{ color: '#0f172a' }}>{result.productivity.median}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Percentil 25 (P25):</span>
              <strong style={{ color: '#475569' }}>{result.productivity.percentile25}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Percentil 75 (P75):</span>
              <strong style={{ color: '#475569' }}>{result.productivity.percentile75}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Desviación Estándar:</span>
              <strong style={{ color: '#475569' }}>&plusmn; {result.productivity.stdDev}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Rango (Mín / Máx):</span>
              <strong style={{ color: '#0f172a' }}>{result.productivity.min}% / {result.productivity.max}%</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Secundario de Gráficos y Listados */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Tarjeta 2: Progreso por Etapa */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: '#0ea5e9' }} /> Distribución por Etapas de Progreso
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.stageDistribution.map(stageItem => (
              <div key={stageItem.code} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: '#334155' }}>{stageItem.label}</span>
                  <span style={{ color: '#64748b' }}>{stageItem.count} ({stageItem.percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${stageItem.percentage}%`, 
                    backgroundColor: stageItem.code === 'PUBLISHED' ? '#2563eb' : stageItem.code === 'READY_FOR_PUBLICATION' ? '#10b981' : '#f59e0b',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta 9: Calidad Editorial (Rangos de progreso) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} style={{ color: '#f59e0b' }} /> Calidad Editorial (% de Avance)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {result.qualityDistribution.map(item => (
              <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '65px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{item.range}</span>
                <div style={{ flexGrow: 1, height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: item.range === '100%' ? '#16a34a' : '#3b82f6', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '65px', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta 3: Cuellos de Botella */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} /> Cuellos de Botella (Bloqueos)
          </h3>
          {result.bottlenecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {result.bottlenecks.map(b => (
                <div key={b.code} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: '#dc2626' }}>{b.label}</span>
                    <span style={{ color: '#64748b' }}>{b.count} aportes ({b.percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.percentage}%`, backgroundColor: '#ef4444', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              ✓ Sin bloqueos activos en la selección
            </div>
          )}
        </div>

        {/* Tarjeta 8: Timeline */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: '#0ea5e9' }} /> Historial Cronológico de Carga (Mensual)
          </h3>
          {renderTimelineChart()}
        </div>

      </div>

      {/* Grid de 3 Columnas: Recomendaciones, Riesgos y Publicación */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Tarjeta 5: Recomendaciones del Sistema */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: '#3b82f6' }} /> Recomendaciones de Prioridad
          </h3>
          {result.topRecommendations.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.topRecommendations.map(rec => (
                <li key={rec.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.35rem 0.5rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{rec.title}</span>
                  <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    {rec.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No hay acciones sugeridas pendientes
            </div>
          )}
        </div>

        {/* Tarjeta 10: Riesgos e Inconsistencias */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} /> Alertas de Riesgo Editorial
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569' }}>Publicados con advertencias:</span>
              <strong style={{ color: result.risks.publishedWithWarnings > 0 ? '#dc2626' : '#1e293b' }}>
                {result.risks.publishedWithWarnings}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569' }}>Publicados sin consentimiento:</span>
              <strong style={{ color: result.risks.publishedWithoutConsent > 0 ? '#dc2626' : '#1e293b' }}>
                {result.risks.publishedWithoutConsent}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569' }}>Validaciones desconocidas (unknown):</span>
              <strong style={{ color: result.risks.unknownValidations > 0 ? '#d97706' : '#1e293b' }}>
                {result.risks.unknownValidations}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569' }}>Conflictos históricos:</span>
              <strong style={{ color: result.risks.historicalConflicts > 0 ? '#b91c1c' : '#1e293b' }}>
                {result.risks.historicalConflicts}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569' }}>Elegibles sin publicar:</span>
              <strong style={{ color: '#16a34a' }}>{result.risks.eligibleButNotPublished}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Bloqueados por consentimiento:</span>
              <strong style={{ color: '#dc2626' }}>{result.risks.blockedForConsent}</strong>
            </div>
          </div>
        </div>

        {/* Tarjeta 7: Métricas de Publicación */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: '#2563eb' }} /> Estados de Publicación
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Aportes Publicados:</span>
              <strong style={{ color: '#0f172a' }}>{result.publicationMetrics.publishedCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Listos para Publicar (Publishable):</span>
              <strong style={{ color: '#16a34a' }}>{result.publicationMetrics.publishableCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Publicación Programada (Scheduled):</span>
              <strong style={{ color: '#d97706' }}>{result.publicationMetrics.scheduledCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Acceso Restringido (Restricted):</span>
              <strong style={{ color: '#dc2626' }}>{result.publicationMetrics.restrictedCount}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Footer / Metadatos de Auditoría */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div>
          <span>Versión Plataforma: <strong>v{result.metadata.platformVersion}</strong></span>
          <span style={{ margin: '0 0.5rem' }}>&middot;</span>
          <span>Motor Elegibilidad: <strong>v{result.metadata.editorialVersion}</strong></span>
          <span style={{ margin: '0 0.5rem' }}>&middot;</span>
          <span>Progreso: <strong>v{result.metadata.progressVersion}</strong></span>
          <span style={{ margin: '0 0.5rem' }}>&middot;</span>
          <span>Dashboard: <strong>v{result.metadata.dashboardVersion}</strong></span>
        </div>
        <div>
          <span>Export Hash: <code style={{ backgroundColor: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>{result.metadata.exportMetadata.hash}</code></span>
          <span style={{ margin: '0 0.5rem' }}>&middot;</span>
          <span>Actualizado: <strong>{new Date(result.metadata.generatedAt).toLocaleString()}</strong></span>
        </div>
      </div>

    </div>
  );
}
