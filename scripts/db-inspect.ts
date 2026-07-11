import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  console.log('Checking select_options table...');
  const { data: selectOptionsData, error: selectOptionsError } = await supabase
    .from('select_options')
    .select('*')
    .limit(5);

  if (selectOptionsError) {
    console.error('Error fetching select_options:', selectOptionsError);
  } else {
    console.log('select_options sample data:', selectOptionsData);
    if (selectOptionsData.length > 0) {
      console.log('Columns of select_options:', Object.keys(selectOptionsData[0]));
    } else {
      console.log('select_options is empty.');
    }
  }

  console.log('Checking audit_logs table...');
  const { data: auditData, error: auditError } = await supabase
    .from('audit_logs')
    .select('*')
    .limit(1);
  if (auditError) {
    console.error('Error fetching audit_logs:', auditError);
  } else {
    console.log('audit_logs columns:', auditData.length > 0 ? Object.keys(auditData[0]) : 'empty');
  }
}

main().catch(console.error);
