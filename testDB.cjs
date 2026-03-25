const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) process.env[k] = envConfig[k];

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (data) {
        fs.writeFileSync('cols.txt', data.length > 0 ? Object.keys(data[0]).join(', ') : 'No data in profiles table, but table exists.');
        console.log('Wrote profiles cols to cols.txt');
    } else {
        fs.writeFileSync('cols.txt', 'Error: ' + JSON.stringify(error));
        console.log('Error wrote to cols.txt');
    }
}
run();
