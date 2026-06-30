'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { KeyRound, Mail, AlertCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Capturar errores de redirección
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setErrorMsg('No tienes permisos administrativos para acceder al panel. Si crees que esto es un error, contacta al administrador.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas. Verifica el correo y la contraseña.' : error.message);
      }

      // Redireccionar al panel protegido
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
      
      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          marginBottom: '1rem'
        }}>
          <img src="/icon-192.png" alt="Logo Cerro Pico Truncado" style={{ height: '64px', width: 'auto', borderRadius: '8px' }} />
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Panel Editorial</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Memoria Viva Pico Truncado</p>
      </div>

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Correo Electrónico</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="email"
              required
              placeholder="usuario@memoriaviva.org"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="password"
              required
              placeholder="••••••••"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
          disabled={loading}
        >
          {loading ? 'Iniciando sesión...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          ← Volver al portal público
        </Link>
      </div>

    </div>
  );
}

export default function AdminLogin() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--warm-white)',
      padding: '1.5rem'
    }}>
      <Suspense fallback={
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '2rem auto' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando formulario...</p>
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
