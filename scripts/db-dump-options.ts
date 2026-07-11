import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('select_options').select('*');
  if (error) {
    console.error('Error fetching select_options:', error);
  } else {
    console.log('ALL SELECT OPTIONS:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
