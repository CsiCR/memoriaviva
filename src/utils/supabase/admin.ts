import { createClient } from '@supabase/supabase-js';
import { clientEnv, serverEnv } from '@/lib/config/env';

export function createAdminClient() {
  if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv?.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Variables de entorno de Supabase faltantes en el servidor.');
  }
  
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

