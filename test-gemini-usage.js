import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');

import { createClient } from '@supabase/supabase-js';
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1] || '';
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data } = await supabase.from('settings').select('global_gemini_key').limit(1).single();
  const apiKey = data?.global_gemini_key || '';
  
  if (!apiKey) {
    console.log("No Gemini API key found");
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: 'You are a helpful assistant.' });
  const result = await model.generateContent("Hello, say ok");
  
  console.log("Response text:", result.response.text());
  console.log("Usage metadata:", JSON.stringify(result.response.usageMetadata, null, 2));
}

main();
