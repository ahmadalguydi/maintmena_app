import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
const { Client } = pg;
const env = dotenv.parse(fs.readFileSync('.env'));
const client = new Client({ connectionString: env.VITE_SUPABASE_URL.replace('https://', 'postgresql://postgres:').replace('.supabase.co', '.supabase.co:5432/postgres') + '?sslmode=require' });
// Better: just use supabase-js since the DB URL might not be available
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await supabase.from('maintenance_requests').select('id, status, urgency, category, assigned_seller_id, preferred_start_date').order('created_at', { ascending: false }).limit(5);
console.log(JSON.stringify(data, null, 2));
if (error) console.error(error);
