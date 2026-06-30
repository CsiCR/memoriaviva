import { createAdminClient } from '../src/utils/supabase/admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkUsers() {
  const supabase = createAdminClient();

  console.log('--- AUTENTICACIÓN (auth.users) ---');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error al listar usuarios de auth:', authError.message);
  } else {
    authData.users.forEach((u) => {
      console.log(`- ID: ${u.id} | Email: ${u.email} | Metadata:`, u.user_metadata);
    });
  }

  console.log('\n--- PERFILES (public.profiles) ---');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('Error al listar perfiles:', profilesError.message);
  } else {
    profiles.forEach((p) => {
      console.log(`- ID: ${p.id} | Nombre: ${p.full_name} | Rol: ${p.role}`);
    });
  }
}

checkUsers().catch(console.error);
