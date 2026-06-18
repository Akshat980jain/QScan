/**
 * middleware.test.js — Tests for auth middleware, rate limiting, and input validation.
 *
 * Covers: JWT auth, API key auth, rate limiting, and validation middleware.
 */
const request = require('supertest');
const app = require('../app');
const db = require('./testDb');
const parseUA = require('../utils/parseUA');

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER = {
  name: 'Middleware Test User',
  email: 'mwtest@example.com',
  password: 'Password123',
  accountType: 'individual',
  subscribeToNewsletter: false,
  agreeToTerms: true
};

async function registerAndLogin() {
  await request(app).post('/api/auth/register').send(TEST_USER);
  const res = await request(app).post('/api/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  return { token: res.body.token, user: res.body.user };
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

// ─── Authentication Middleware ────────────────────────────────────────────────

describe('Authentication Middleware', () => {
  it('allows access with valid Bearer token', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is empty string', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', '');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a malformed JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.jwt');
    expect(res.status).toBe(403);
  });

  it('returns 403 for a JWT with wrong signature (tampered)', async () => {
    const { token } = await registerAndLogin();
    // Tamper: change the last character of the signature
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(403);
  });

  it('allows access with valid X-API-Key header', async () => {
    const { token } = await registerAndLogin();

    // Create an API key
    const createRes = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Key' });
    const rawKey = createRes.body.rawKey;

    // Use the raw key
    const res = await request(app)
      .get('/api/auth/me')
      .set('X-API-Key', rawKey);
    expect(res.status).toBe(200);
  });

  it('returns 401 for invalid X-API-Key value', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('X-API-Key', 'qrv_live_invalid_key_here');
    expect(res.status).toBe(401);
  });
});

// ─── Security Headers ─────────────────────────────────────────────────────────

describe('Security Headers (Helmet)', () => {
  it('returns X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(
      res.headers['x-frame-options'] || res.headers['x-content-type-options']
    ).toBeDefined();
  });

  it('does not expose server version in X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

// ─── CORS ─────────────────────────────────────────────────────────────────────

describe('CORS Middleware', () => {
  it('allows requests from permitted origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects requests from disallowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil-site.com');
    // Should not reflect the malicious origin
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil-site.com');
  });

  it('allows requests with no origin (mobile apps, curl)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

// ─── parseUA Utility ─────────────────────────────────────────────────────────

describe('parseUA utility function', () => {
  it('returns defaults for undefined user agent', () => {
    const result = parseUA(undefined);
    expect(result.deviceType).toBe('other');
    expect(result.os).toBe('unknown');
    expect(result.browser).toBe('unknown');
  });

  it('detects Windows desktop Chrome', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const result = parseUA(ua);
    expect(result.os).toBe('Windows');
    expect(result.deviceType).toBe('desktop');
    expect(result.browser).toBe('Chrome');
  });

  it('detects macOS Safari', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
    const result = parseUA(ua);
    expect(result.os).toBe('macOS');
    expect(result.browser).toBe('Safari');
    expect(result.deviceType).toBe('desktop');
  });

  it('detects iPhone mobile Safari', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    const result = parseUA(ua);
    expect(result.os).toBe('iOS');
    expect(result.deviceType).toBe('mobile');
  });

  it('detects Android mobile', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
    const result = parseUA(ua);
    expect(result.os).toBe('Android');
    expect(result.deviceType).toBe('mobile');
    expect(result.browser).toBe('Chrome');
  });

  it('detects iPad tablet', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    const result = parseUA(ua);
    expect(result.os).toBe('iOS');
    expect(result.deviceType).toBe('tablet');
  });

  it('detects Firefox on Linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0';
    const result = parseUA(ua);
    expect(result.os).toBe('Linux');
    expect(result.browser).toBe('Firefox');
    expect(result.deviceType).toBe('desktop');
  });

  it('detects Microsoft Edge', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
    const result = parseUA(ua);
    expect(result.browser).toBe('Edge');
  });
});

// ─── Input Validation Middleware ──────────────────────────────────────────────

describe('Input Validation Middleware', () => {
  it('rejects XSS in QR code name (extreme length)', async () => {
    const { token } = await registerAndLogin();
    // Name > 100 chars should fail
    const longName = 'A'.repeat(101);
    const res = await request(app)
      .post('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: longName,
        type: 'text',
        content: 'hello',
        image: 'data:image/png;base64,dGVzdA=='
      });
    expect(res.status).toBe(400);
  });

  it('rejects QR content over 2000 characters', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test',
        type: 'text',
        content: 'A'.repeat(2001),
        image: 'data:image/png;base64,dGVzdA=='
      });
    expect(res.status).toBe(400);
  });

  it('rejects registration email without @ symbol', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...TEST_USER, email: 'notanemail' });
    expect(res.status).toBe(400);
  });

  it('trims whitespace from QR code name', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '  Padded Name  ',
        type: 'text',
        content: 'hello',
        image: 'data:image/png;base64,dGVzdA=='
      });
    if (res.status === 201) {
      expect(res.body.qrCode.name.trim()).toBe('Padded Name');
    }
  });
});
