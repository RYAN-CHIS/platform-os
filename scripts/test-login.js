const http = require('http');

const parseCookies = (setCookieHeaders) => {
  if (!setCookieHeaders) return '';
  const h = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return h.map(c => c.split(';')[0]).join('; ');
};

function request(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 3001, path, method,
      headers: { ...headers }
    };
    if (body) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        cookies: res.headers['set-cookie'],
        body: data.substring(0, 500)
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Get CSRF token and cookie
  const csrfRes = await request('GET', '/api/auth/csrf');
  const csrfJson = JSON.parse(csrfRes.body);
  const csrfToken = csrfJson.csrfToken;
  const csrfCookie = parseCookies(csrfRes.cookies);
  
  console.log('CSRF token:', csrfToken?.substring(0, 20) + '...');
  console.log('CSRF cookie:', csrfCookie || '(none)');

  // Step 2: Login
  const loginBody = `csrfToken=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent('admin@yunwu.com')}&password=${encodeURIComponent('admin123')}`;
  const loginRes = await request('POST', '/api/auth/callback/credentials', { Cookie: csrfCookie }, loginBody);
  
  console.log('\nLogin response:');
  console.log('  Status:', loginRes.status);
  console.log('  Location:', loginRes.headers.location || '(none)');
  console.log('  Body:', loginRes.body);
  
  // Step 3: If redirect to signin with error, check the error
  if (loginRes.headers.location) {
    const loc = loginRes.headers.location;
    if (loc.includes('error=CredentialsSignin')) {
      console.log('\n❌ ERROR: Invalid credentials (bad email or password)');
    } else if (loc.includes('csrf=true')) {
      console.log('\n⚠️ CSRF error (test script cookie issue - ignore for browser)');
    } else {
      console.log('\nRedirected to:', loc);
    }
  }

  // Step 4: Try without CSRF, direct test of authorize function
  console.log('\n--- Debug: Direct PostgreSQL user check ---');
  const { Client } = require('pg');
  const client = new Client({
    host: 'ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech',
    port: 5432, database: 'neondb', user: 'neondb_owner', password: 'npg_cAas8kuHmrO0',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const bcrypt = require('bcryptjs');
  const user = await client.query('SELECT email, password FROM users WHERE email = $1', ['admin@yunwu.com']);
  if (user.rows.length > 0) {
    const pwd = user.rows[0].password;
    console.log('  User email:', user.rows[0].email);
    console.log('  Password hash:', pwd?.substring(0, 30) + '...');
    console.log('  bcrypt match:', bcrypt.compareSync('admin123', pwd));
  } else {
    console.log('  User NOT FOUND in database');
  }
  await client.end();
}

main().catch(e => console.error(e));
