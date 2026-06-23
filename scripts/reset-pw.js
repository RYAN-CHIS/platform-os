const { Client } = require('pg');

const passwordHash = '$2b$10$fpY3FqnljQr3P7/LBBS3G.7US6FwJXOBcK84uOUo8lyrRSMsOCPse';

const client = new Client({
  host: 'ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_cAas8kuHmrO0',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('✅ Connected to database');

  // Check if user exists
  const check = await client.query('SELECT id, email, role FROM users WHERE email = $1', ['admin@yunwu.com']);
  
  if (check.rows.length === 0) {
    console.log('❌ User not found, creating...');
    const insert = await client.query(
      "INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, email",
      ['admin@yunwu.com', passwordHash, 'Admin', 'SUPER_ADMIN']
    );
    console.log('✅ User created:', insert.rows[0]);
  } else {
    console.log('Found user:', check.rows[0]);
    const update = await client.query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2",
      [passwordHash, 'admin@yunwu.com']
    );
    console.log('✅ Password updated, rows:', update.rowCount);
  }

  await client.end();
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  client.end();
  process.exit(1);
});
