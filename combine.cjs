const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let combinedSql = '';
for (const f of files) {
    combinedSql += `\n\n-- ==========================================\n-- Migration: ${f}\n-- ==========================================\n\n`;
    combinedSql += fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
}

fs.writeFileSync(path.join(migrationsDir, '00000000000000_initial_schema.sql'), combinedSql);
console.log('Combined all migrations into 00000000000000_initial_schema.sql');
