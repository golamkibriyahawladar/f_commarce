import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');

const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1] || '';
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('integrations')
    .select('credentials')
    .eq('provider', 'ai_agent')
    .limit(5);
  
  if (data) {
    data.forEach((d, i) => {
      const c = d.credentials || {};
      console.log(`Agent ${i+1}: name="${c.name}", llm_provider="${c.llm_provider}", model_name="${c.model_name}"`);
    });
  }
}
main();
