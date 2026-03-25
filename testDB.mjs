import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="?([^"\n]+)"?/);
const keyMatch = envFile.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)"?/);

if (!urlMatch || !keyMatch) {
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
    let email = 'seller@test.com';
    let { data: users, error } = await supabase.from('profiles').select('id, email').eq('email', email);
    if (!users || users.length === 0) {
        console.log("No profile found for email");
        // Check user_roles directly without join to auth.users (RLS might prevent)
        let { data: roles } = await supabase.from('user_roles').select('*');
        console.log("All roles visible to anon:", roles);
        return;
    }

    console.log("Profile id:", users[0].id);
    let { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', users[0].id);
    console.log("Roles for user:", roles);
}
run();
