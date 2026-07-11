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
  
  console.log('Fetching historical-uploads bucket configuration...');
  const { data, error } = await supabase.storage.getBucket('historical-uploads');
  
  if (error) {
    console.error('Error fetching bucket:', error);
  } else {
    console.log('BUCKET CONFIGURATION:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
