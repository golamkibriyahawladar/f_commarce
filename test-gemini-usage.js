import { GoogleGenerativeAI } from '@google/generative-ai';
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
  // Get all companies that have settings
  const { data: companies } = await supabase.from('companies').select('id, settings');
  
  let apiKey = '';
  for (const c of (companies || [])) {
    if (c.settings?.global_gemini_key) {
      apiKey = c.settings.global_gemini_key;
      console.log("Found key in company:", c.id);
      break;
    }
  }
  
  if (!apiKey) {
    // Try credentials table
    const { data: creds } = await supabase.from('credentials').select('*');
    console.log("Credentials table:", JSON.stringify(creds, null, 2));
    
    for (const c of (creds || [])) {
      if (c.credential_type === 'gemini' && c.api_key) {
        apiKey = c.api_key;
        console.log("Found key in credentials table");
        break;
      }
    }
  }
  
  if (!apiKey) {
    console.log("No Gemini key found anywhere");
    return;
  }

  console.log("Testing with model: gemini-2.5-pro");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      systemInstruction: 'You are a helpful assistant.'
    });
    const result = await model.generateContent("say ok");
    console.log("SUCCESS! Response:", result.response.text());
    console.log("Usage:", JSON.stringify(result.response.usageMetadata, null, 2));
  } catch(e) {
    console.error("ERROR with gemini-2.5-pro:", e.message);
  }
}
main();
