const fs = require('fs');
const dotenv = require('dotenv');
const { Client } = require('pg');
const env = dotenv.parse(fs.readFileSync('.env'));
const client = new Client({ connectionString: env.DATABASE_URL + '?sslmode=require' });
client.connect().then(() => {
  client.query('SELECT id, status, urgency, category, assigned_seller_id, preferred_start_date FROM maintenance_requests ORDER BY created_at DESC LIMIT 5').then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
  }).catch(console.error);
}).catch(console.error);
