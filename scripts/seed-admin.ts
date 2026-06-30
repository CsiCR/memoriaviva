import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@memoriaviva.org';
const password = process.env.INITIAL_ADMIN_PASSWORD || 'CambiarEstaContrasena123!';
const fullName = process.env.INITIAL_ADMIN_NAME || 'Administrador Memoria Viva';

async function seedAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en .env.local');
    process.exit(1);
  }

  console.log('Iniciando creación de administrador...');
  console.log(`Email de destino: ${email}`);

  // Crear cliente de Supabase con Service Role (bypass RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Intentar crear el usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'admin'
    }
  });

  let userId: string;

  if (authError) {
    if (authError.message.includes('already exists') || authError.status === 422) {
      console.log('El usuario de autenticación ya existe. Buscando ID de usuario...');
      
      // Buscar el usuario existente por email
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Error al listar usuarios para buscar el ID:', listError.message);
        process.exit(1);
      }
      
      const existingUser = listData.users.find(u => u.email === email);
      if (!existingUser) {
        console.error('No se pudo encontrar al usuario existente por correo.');
        process.exit(1);
      }
      
      userId = existingUser.id;
      console.log(`ID del usuario encontrado: ${userId}`);
    } else {
      console.error('Error al crear usuario de autenticación:', authError.message);
      process.exit(1);
    }
  } else {
    userId = authData.user.id;
    console.log(`Usuario de autenticación creado exitosamente con ID: ${userId}`);
  }

  // 2. Asegurarse de que el perfil en la tabla profiles esté creado y tenga rol de administrador
  console.log('Verificando perfil en la tabla profiles...');
  const { data: profileData, error: profileFetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileFetchError && profileFetchError.code !== 'PGRST116') { // PGRST116 es "no rows returned"
    console.error('Error al verificar perfil existente:', profileFetchError.message);
    process.exit(1);
  }

  if (!profileData) {
    console.log('El perfil no existe. Insertando perfil de administrador...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: fullName,
        role: 'admin'
      });

    if (insertError) {
      console.error('Error al crear el perfil de administrador:', insertError.message);
      process.exit(1);
    }
    console.log('Perfil de administrador creado exitosamente.');
  } else {
    console.log('El perfil ya existe. Asegurando rol de administrador...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role: 'admin'
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar el perfil a administrador:', updateError.message);
      process.exit(1);
    }
    console.log('Perfil actualizado/confirmado como administrador exitosamente.');
  }

  console.log('¡Proceso de semilla completado con éxito!');
}

seedAdmin().catch((err) => {
  console.error('Error no controlado durante la semilla:', err);
  process.exit(1);
});
