'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Bell, Phone, Mail, ChevronRight, Check } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  contribution_id: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  contributions?: {
    catalog_code: string | null;
    title: string;
    contributors?: {
      full_name: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
}

export default function AdminNotificationsBell() {
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Cargar notificaciones
  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Unimos con contributions y contributors on-the-fly para no duplicar datos personales en la base de datos
      const { data, error } = await supabase
        .from('admin_notifications')
        .select(`
          *,
          contributions (
            catalog_code,
            title,
            contributors (
              full_name,
              phone,
              email
            )
          )
        `)
        .order('is_resolved', { ascending: true }) // No resueltas primero
        .order('created_at', { ascending: false }) // Más recientes primero
        .limit(20);

      if (error) {
        console.error('Error fetching admin notifications:', error);
      } else {
        const list = (data || []) as any[];
        setNotifications(list);
        
        // Contar las no leídas
        const unread = list.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    // Si abrimos y hay notificaciones no leídas, marcamos como leídas en lote las mostradas
    if (!isOpen && unreadCount > 0) {
      markAllShownAsRead();
    }
  };

  const markAllShownAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
      } else {
        setNotifications((prev) =>
          prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkResolved = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_resolved: true,
          is_read: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
          read_at: notification.is_read ? undefined : new Date().toISOString()
        })
        .eq('id', notification.id);

      if (error) {
        console.error('Error marking notification as resolved:', error);
      } else {
        // También marcamos los avisos oversized como resueltos para esta contribución (Alcance Acotado)
        // Buscamos si hay avisos asociados a esta contribución para resolverlos
        await supabase
          .from('oversized_file_notices')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id || null
          })
          .eq('contribution_id', notification.contribution_id)
          .eq('status', 'pending');

        loadNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Icono Campana */}
      <button
        onClick={toggleDropdown}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
          outline: 'none'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.68rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '45px',
          right: 0,
          width: '380px',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '480px'
        }}>
          {/* Header Desplegable */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: '#0f172a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <span>Notificaciones Administrativas</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                {unreadCount} nuevas
              </span>
            )}
          </div>

          {/* Listado */}
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {notifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map((notif) => {
                  const contrib = notif.contributions;
                  const contributor = contrib?.contributors;
                  
                  return (
                    <div
                      key={notif.id}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: notif.is_read ? '#ffffff' : '#f0f9ff',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 650, color: notif.is_resolved ? '#64748b' : '#0f172a' }}>
                          {notif.title}
                        </span>
                        {!notif.is_resolved && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            flexShrink: 0
                          }}>
                            Faltan archivos
                          </span>
                        )}
                      </div>

                      {/* Mensaje principal */}
                      <p style={{ margin: '0 0 0.5rem 0', color: '#475569', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {notif.message}
                      </p>

                      {/* Datos personales cargados en tiempo real */}
                      {contributor && (
                        <div style={{
                          backgroundColor: '#f8fafc',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          marginBottom: '0.75rem',
                          fontSize: '0.78rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          border: '1px solid #edf2f7'
                        }}>
                          <div>
                            <span style={{ color: '#64748b' }}>Aportante:</span>{' '}
                            <strong style={{ color: '#0f172a' }}>{contributor.full_name}</strong>
                          </div>
                          {contributor.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={12} style={{ color: '#16a34a' }} />
                              <a href={`https://wa.me/${contributor.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'underline' }}>
                                {contributor.phone}
                              </a>
                            </div>
                          )}
                          {contributor.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail size={12} style={{ color: '#0284c7' }} />
                              <a href={`mailto:${contributor.email}`} style={{ color: '#0284c7', textDecoration: 'underline' }}>
                                {contributor.email}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer de la notificación con acciones */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {new Date(notif.created_at).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {!notif.is_resolved && (
                            <button
                              onClick={(e) => handleMarkResolved(e, notif)}
                              className="btn btn-outline btn-sm"
                              style={{
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                color: '#d97706',
                                borderColor: '#fde68a',
                                backgroundColor: '#fffbeb'
                              }}
                            >
                              <Check size={12} /> Resolver
                            </button>
                          )}
                          <Link
                            href={`/admin/aportes/${notif.contribution_id}`}
                            onClick={() => setIsOpen(false)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.1rem',
                              fontWeight: 600,
                              color: '#0284c7',
                              fontSize: '0.72rem',
                              textDecoration: 'none'
                            }}
                          >
                            Ir al aporte <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                No tienes notificaciones pendientes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
