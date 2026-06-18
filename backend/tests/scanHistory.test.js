/**
 * scanHistory.test.js — Integration tests for /api/scan-history/*
 *
 * Covers: save scan, list, delete single, clear all, and the 100-item cap.
 */
const request = require('supertest');
const app = require('../app');
const db = require('./testDb');

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER = {
  name: 'Scan Test User',
  email: 'scantest@example.com',
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
  return res.body.token;
}

async function saveScan(token, content = 'https://example.com', type = 'url') {
  return request(app)
    .post('/api/scan-history')
    .set('Authorization', `Bearer ${token}`)
    .send({ content, type });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

// ─── POST /api/scan-history ───────────────────────────────────────────────────

describe('POST /api/scan-history', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('saves a scan entry', async () => {
    const res = await saveScan(token, 'https://google.com', 'url');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.scan.content).toBe('https://google.com');
    expect(res.body.scan.type).toBe('url');
  });

  it('saves a scan with default type when type is omitted', async () => {
    const res = await request(app)
      .post('/api/scan-history')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'WIFI:T:WPA;S:Net;P:pass;;' });
    expect(res.status).toBe(201);
    expect(res.body.scan.type).toBe('unknown');
  });

  it('returns 400 if content is missing', async () => {
    const res = await request(app)
      .post('/api/scan-history')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/scan-history')
      .send({ content: 'test' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/scan-history ───────────────────────────────────────────────────

describe('GET /api/scan-history', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('returns empty list initially', async () => {
    const res = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.scans).toEqual([]);
  });

  it('returns saved scans in reverse chronological order', async () => {
    await saveScan(token, 'first.com');
    await saveScan(token, 'second.com');

    const res = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.scans.length).toBe(2);
    // Most recent should be first
    expect(res.body.scans[0].content).toBe('second.com');
  });

  it('returns only current user\'s scan history', async () => {
    await saveScan(token, 'my-secret.com');

    // Register a second user
    await request(app).post('/api/auth/register').send({
      ...TEST_USER,
      email: 'other@example.com'
    });
    const otherRes = await request(app).post('/api/auth/login').send({
      email: 'other@example.com',
      password: TEST_USER.password
    });
    const otherToken = otherRes.body.token;

    const res = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.body.scans).toEqual([]);
  });

  it('returns count alongside scans', async () => {
    await saveScan(token, 'a.com');
    await saveScan(token, 'b.com');

    const res = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.count).toBe(2);
  });
});

// ─── DELETE /api/scan-history/:id ─────────────────────────────────────────────

describe('DELETE /api/scan-history/:id', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('deletes a specific scan entry', async () => {
    const created = await saveScan(token, 'to-delete.com');
    const scanId = created.body.scan._id;

    const deleteRes = await request(app)
      .delete(`/api/scan-history/${scanId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify it's gone
    const listRes = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.scans.find(s => s._id === scanId)).toBeUndefined();
  });

  it('returns 404 for non-existent scan', async () => {
    const res = await request(app)
      .delete('/api/scan-history/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('cannot delete another user\'s scan', async () => {
    const created = await saveScan(token, 'private.com');
    const scanId = created.body.scan._id;

    // Second user
    await request(app).post('/api/auth/register').send({
      ...TEST_USER,
      email: 'hacker@example.com'
    });
    const hackerRes = await request(app).post('/api/auth/login').send({
      email: 'hacker@example.com',
      password: TEST_USER.password
    });
    const hackerToken = hackerRes.body.token;

    const res = await request(app)
      .delete(`/api/scan-history/${scanId}`)
      .set('Authorization', `Bearer ${hackerToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/scan-history ─────────────────────────────────────────────────

describe('DELETE /api/scan-history (clear all)', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('clears all scan history for the user', async () => {
    await saveScan(token, 'a.com');
    await saveScan(token, 'b.com');
    await saveScan(token, 'c.com');

    const clearRes = await request(app)
      .delete('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);

    const listRes = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.scans.length).toBe(0);
  });

  it('only clears the current user\'s history (not others)', async () => {
    // Second user's scan
    await request(app).post('/api/auth/register').send({
      ...TEST_USER,
      email: 'other2@example.com'
    });
    const otherRes = await request(app).post('/api/auth/login').send({
      email: 'other2@example.com',
      password: TEST_USER.password
    });
    const otherToken = otherRes.body.token;
    await saveScan(otherToken, 'other-scan.com');

    // Clear current user's history (empty)
    await request(app)
      .delete('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);

    // Other user's scan should still be there
    const otherList = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherList.body.scans.length).toBe(1);
  });
});

// ─── 100-item cap ─────────────────────────────────────────────────────────────

describe('Scan history 100-item cap', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('does not exceed 100 entries', async () => {
    // Insert 105 scans
    const saves = [];
    for (let i = 0; i < 105; i++) {
      saves.push(saveScan(token, `scan${i}.com`));
    }
    await Promise.all(saves);

    const res = await request(app)
      .get('/api/scan-history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.scans.length).toBeLessThanOrEqual(100);
  }, 30000);
});
