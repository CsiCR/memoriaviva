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
  const { data, error } = await supabase
    .from('contributions')
    .select('id, title, contribution_type, catalog_code, created_at, editorial_status, contributor_id, contributors (full_name)');
    
  if (error) {
    console.error('Error fetching contributions:', error);
  } else {
    console.log('ALL CONTRIBUTIONS:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
