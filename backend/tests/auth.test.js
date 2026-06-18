/**
 * auth.test.js — Integration tests for all /api/auth/* routes.
 *
 * Covers: register, login, /me, profile update, password change,
 *         session listing/revocation, and API key management.
 */
const request = require('supertest');
const app = require('../app');
const db = require('./testDb');

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123',
  accountType: 'individual',
  subscribeToNewsletter: false,
  agreeToTerms: true
};

/**
 * Register and return the auth response body.
 */
async function registerUser(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...TEST_USER, ...overrides });
  return res;
}

/**
 * Login and return { token, user }.
 */
async function loginUser(email = TEST_USER.email, password = TEST_USER.password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res;
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
    // Password must never be returned
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 400 for duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 if agreeToTerms is false', async () => {
    const res = await registerUser({ agreeToTerms: false });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 if name is too short (< 2 chars)', async () => {
    const res = await registerUser({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid email', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 if password lacks uppercase letter', async () => {
    const res = await registerUser({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 if password lacks a number', async () => {
    const res = await registerUser({ password: 'PasswordOnly' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 if password is too short (< 6 chars)', async () => {
    const res = await registerUser({ password: 'Pw1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates a session on register', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    // token exists means a session was created
    expect(res.body.token).toBeTruthy();
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('logs in with correct credentials', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 400 with wrong password', async () => {
    const res = await loginUser(TEST_USER.email, 'WrongPassword1');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 with non-existent email', async () => {
    const res = await loginUser('nobody@example.com', 'Password123');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 with missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    await registerUser();
    const res = await loginUser();
    token = res.body.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 403 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.valid');
    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────

describe('PUT /api/auth/profile', () => {
  let token;

  beforeEach(async () => {
    await registerUser();
    const res = await loginUser();
    token = res.body.token;
  });

  it('updates user name', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Updated Name');
  });

  it('returns 400 if name is too short', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if new email is already taken by another user', async () => {
    // Register a second user
    await registerUser({ email: 'other@example.com' });
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────

describe('POST /api/auth/change-password', () => {
  let token;

  beforeEach(async () => {
    await registerUser();
    const res = await loginUser();
    token = res.body.token;
  });

  it('changes password with correct current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: TEST_USER.password, newPassword: 'NewSecure456' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects if current password is wrong', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword1', newPassword: 'NewSecure456' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('can login with new password after change', async () => {
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: TEST_USER.password, newPassword: 'NewSecure456' });

    const loginRes = await loginUser(TEST_USER.email, 'NewSecure456');
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  it('cannot login with old password after change', async () => {
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: TEST_USER.password, newPassword: 'NewSecure456' });

    const loginRes = await loginUser(TEST_USER.email, TEST_USER.password);
    expect(loginRes.status).toBe(400);
  });
});

// ─── Session Management ───────────────────────────────────────────────────────

describe('Session Management', () => {
  let token;

  beforeEach(async () => {
    const res = await registerUser();
    token = res.body.token;
  });

  it('GET /api/auth/sessions — returns current session', async () => {
    const res = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
    // The current session should be marked
    const current = res.body.sessions.find(s => s.isCurrent);
    expect(current).toBeDefined();
  });

  it('DELETE /api/auth/sessions/:id — revokes a specific session', async () => {
    const Session = require('../models/Session');
    const User = require('../models/User');
    const user = await User.findOne({ email: TEST_USER.email });

    // Create another session directly in DB
    const mockSession = await Session.create({
      userId: user._id,
      token: 'mock-different-session-token-' + Date.now(),
      ip: '127.0.0.1',
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop'
    });

    const deleteRes = await request(app)
      .delete(`/api/auth/sessions/${mockSession._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it('DELETE /api/auth/sessions — revokes all other sessions', async () => {
    const Session = require('../models/Session');
    const User = require('../models/User');
    const user = await User.findOne({ email: TEST_USER.email });

    // Create another session directly in DB
    await Session.create({
      userId: user._id,
      token: 'mock-different-session-token-' + Date.now(),
      ip: '127.0.0.1',
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop'
    });

    const deleteRes = await request(app)
      .delete('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Only current session should remain
    const sessRes = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(sessRes.body.sessions.length).toBe(1);
    expect(sessRes.body.sessions[0].isCurrent).toBe(true);
  });
});

// ─── API Key Management ───────────────────────────────────────────────────────

describe('API Key Management', () => {
  let token;

  beforeEach(async () => {
    await registerUser();
    const res = await loginUser();
    token = res.body.token;
  });

  it('POST /api/api-keys — creates a new API key', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Test Key' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.rawKey).toBeDefined();
    // Raw key should only be visible once and start with qrv_
    expect(res.body.rawKey).toMatch(/^qrv_/);
    // keyHash should never be returned
    expect(res.body.apiKey.keyHash).toBeUndefined();
  });

  it('POST /api/api-keys — returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/api-keys — lists keys without exposing hash', async () => {
    await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Key 1' });

    const res = await request(app)
      .get('/api/api-keys')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.apiKeys.length).toBe(1);
    expect(res.body.apiKeys[0].keyHash).toBeUndefined();
  });

  it('DELETE /api/api-keys/:id — revokes a key', async () => {
    const createRes = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Key to delete' });
    const keyId = createRes.body.apiKey._id;

    const deleteRes = await request(app)
      .delete(`/api/api-keys/${keyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Key should no longer exist
    const listRes = await request(app)
      .get('/api/api-keys')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.apiKeys.length).toBe(0);
  });

  it('API key can authenticate requests (X-API-Key header)', async () => {
    const createRes = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Auth Key' });

    const rawKey = createRes.body.rawKey;

    // Use rawKey to authenticate a protected endpoint
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('X-API-Key', rawKey);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(TEST_USER.email);
  });
});
