const { Client } = require('pg');

// Supabase direct Postgres connection
// Connection pooler endpoint (port 6543) - works with service role password
const client = new Client({
  connectionString: 'postgresql://postgres.gkxkihdibkmpryopbkkz:' + process.env.DB_PASSWORD + '@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected!');
    // Test
    const res = await client.query('SELECT count(*) FROM patients');
    console.log('patients count:', res.rows[0].count);
    await client.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
}
run();
