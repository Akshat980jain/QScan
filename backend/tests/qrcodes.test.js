/**
 * qrcodes.test.js — Integration tests for /api/qr-codes/* and /r/:shortId
 *
 * Covers: CRUD, stats/summary (route ordering fix), analytics,
 *         favorite toggle, category update, dynamic QR redirect, bulk ZIP.
 */
const request = require('supertest');
const app = require('../app');
const db = require('./testDb');

// ─── Helpers ────────────────────────────────────────────────────────────────

// Minimal 1×1 transparent PNG as base64 (valid image placeholder for tests)
const DUMMY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const TEST_USER = {
  name: 'QR Test User',
  email: 'qrtest@example.com',
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

async function createQR(token, overrides = {}) {
  return request(app)
    .post('/api/qr-codes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test QR',
      type: 'url',
      content: 'https://example.com',
      image: DUMMY_IMAGE,
      ...overrides
    });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

// ─── POST /api/qr-codes ───────────────────────────────────────────────────────

describe('POST /api/qr-codes', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('creates a URL QR code', async () => {
    const res = await createQR(token);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.qrCode._id).toBeDefined();
    expect(res.body.qrCode.type).toBe('url');
    expect(res.body.qrCode.name).toBe('Test QR');
  });

  it('creates a text QR code', async () => {
    const res = await createQR(token, { type: 'text', content: 'Hello World' });
    expect(res.status).toBe(201);
    expect(res.body.qrCode.type).toBe('text');
  });

  it('creates a wifi QR code', async () => {
    const res = await createQR(token, {
      type: 'wifi',
      content: 'WIFI:T:WPA;S:MyNet;P:pass123;H:false;;',
      metadata: { ssid: 'MyNet', security: 'WPA', hidden: false }
    });
    expect(res.status).toBe(201);
    expect(res.body.qrCode.type).toBe('wifi');
  });

  it('creates a vcard QR code (Android compat)', async () => {
    const res = await createQR(token, {
      type: 'vcard',
      content: 'BEGIN:VCARD\nVERSION:3.0\nFN:Test Person\nEND:VCARD'
    });
    expect(res.status).toBe(201);
    expect(res.body.qrCode.type).toBe('vcard');
  });

  it('creates a dynamic URL QR code', async () => {
    const res = await createQR(token, {
      type: 'url',
      content: 'https://original.com',
      isDynamic: true
    });
    expect(res.status).toBe(201);
    expect(res.body.qrCode.isDynamic).toBe(true);
    expect(res.body.qrCode.shortId).toBeDefined();
    // Content should be rewritten to redirect URL
    expect(res.body.qrCode.content).toContain('/r/');
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/qr-codes')
      .send({ name: 'Test', type: 'text', content: 'hi', image: DUMMY_IMAGE });
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid type', async () => {
    const res = await createQR(token, { type: 'invalidtype' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if image is missing', async () => {
    const res = await request(app)
      .post('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', type: 'text', content: 'hello' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: 'hello', image: DUMMY_IMAGE });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/qr-codes ───────────────────────────────────────────────────────

describe('GET /api/qr-codes', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('returns empty list when no QR codes exist', async () => {
    const res = await request(app)
      .get('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.qrCodes).toEqual([]);
  });

  it('returns only the current user\'s QR codes', async () => {
    await createQR(token);

    // Register a second user
    await request(app).post('/api/auth/register').send({
      ...TEST_USER,
      email: 'other@example.com'
    });
    const res2 = await request(app).post('/api/auth/login').send({
      email: 'other@example.com', password: TEST_USER.password
    });
    const token2 = res2.body.token;

    const other = await request(app)
      .get('/api/qr-codes')
      .set('Authorization', `Bearer ${token2}`);
    expect(other.body.qrCodes).toEqual([]);
  });

  it('returns pagination metadata', async () => {
    await createQR(token);
    await createQR(token, { name: 'QR 2' });

    const res = await request(app)
      .get('/api/qr-codes?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.qrCodes.length).toBe(1);
  });

  it('filters by type', async () => {
    await createQR(token, { type: 'url' });
    await createQR(token, { type: 'text', content: 'hello' });

    const res = await request(app)
      .get('/api/qr-codes?type=text')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.qrCodes.every(qr => qr.type === 'text')).toBe(true);
  });

  it('filters by search term (name)', async () => {
    await createQR(token, { name: 'My Website QR' });
    await createQR(token, { name: 'Office WiFi' });

    const res = await request(app)
      .get('/api/qr-codes?search=Website')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.qrCodes.length).toBe(1);
    expect(res.body.qrCodes[0].name).toBe('My Website QR');
  });
});

// ─── GET /api/qr-codes/stats/summary ─────────────────────────────────────────

describe('GET /api/qr-codes/stats/summary', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('returns stats for user with no QR codes', async () => {
    const res = await request(app)
      .get('/api/qr-codes/stats/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalQRCodes).toBe(0);
    expect(res.body.stats.totalScans).toBe(0);
  });

  it('returns correct totalQRCodes count', async () => {
    await createQR(token);
    await createQR(token, { name: 'QR 2' });

    const res = await request(app)
      .get('/api/qr-codes/stats/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.totalQRCodes).toBe(2);
  });

  it('returns type breakdown', async () => {
    await createQR(token, { type: 'url' });
    await createQR(token, { type: 'text', content: 'hello' });

    const res = await request(app)
      .get('/api/qr-codes/stats/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.stats.typeBreakdown.length).toBeGreaterThan(0);
  });

  it('returns favoritesCount', async () => {
    const qr = await createQR(token);
    const qrId = qr.body.qrCode._id;

    // Mark as favorite
    await request(app)
      .patch(`/api/qr-codes/${qrId}/favorite`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/qr-codes/stats/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.stats.favoritesCount).toBe(1);
  });
});

// ─── GET /api/qr-codes/:id ────────────────────────────────────────────────────

describe('GET /api/qr-codes/:id', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('retrieves a QR code by id', async () => {
    const created = await createQR(token);
    const id = created.body.qrCode._id;

    const res = await request(app)
      .get(`/api/qr-codes/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.qrCode._id).toBe(id);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/qr-codes/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for another user\'s QR code', async () => {
    const created = await createQR(token);
    const id = created.body.qrCode._id;

    // Second user
    await request(app).post('/api/auth/register').send({
      ...TEST_USER, email: 'other2@example.com'
    });
    const res2 = await request(app).post('/api/auth/login').send({
      email: 'other2@example.com', password: TEST_USER.password
    });
    const token2 = res2.body.token;

    const res = await request(app)
      .get(`/api/qr-codes/${id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/qr-codes/:id ────────────────────────────────────────────────────

describe('PUT /api/qr-codes/:id', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('updates QR code name', async () => {
    const created = await createQR(token);
    const id = created.body.qrCode._id;

    const res = await request(app)
      .put(`/api/qr-codes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.qrCode.name).toBe('Updated Name');
  });

  it('updates targetUrl for dynamic QR', async () => {
    const created = await createQR(token, {
      isDynamic: true,
      content: 'https://original.com'
    });
    const id = created.body.qrCode._id;

    const res = await request(app)
      .put(`/api/qr-codes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'https://new-destination.com' });
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/qr-codes/:id ─────────────────────────────────────────────────

describe('DELETE /api/qr-codes/:id', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('soft-deletes a QR code (removes from list)', async () => {
    const created = await createQR(token);
    const id = created.body.qrCode._id;

    const deleteRes = await request(app)
      .delete(`/api/qr-codes/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Should no longer appear in list
    const listRes = await request(app)
      .get('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.qrCodes.find(q => q._id === id)).toBeUndefined();
  });

  it('returns 404 for non-existent QR code', async () => {
    const res = await request(app)
      .delete('/api/qr-codes/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/qr-codes/:id/favorite ────────────────────────────────────────

describe('PATCH /api/qr-codes/:id/favorite', () => {
  let token, qrId;
  beforeEach(async () => {
    token = await registerAndLogin();
    const res = await createQR(token);
    qrId = res.body.qrCode._id;
  });

  it('toggles favorite to true', async () => {
    const res = await request(app)
      .patch(`/api/qr-codes/${qrId}/favorite`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(true);
  });

  it('toggles favorite back to false', async () => {
    await request(app).patch(`/api/qr-codes/${qrId}/favorite`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).patch(`/api/qr-codes/${qrId}/favorite`).set('Authorization', `Bearer ${token}`);
    expect(res.body.isFavorite).toBe(false);
  });
});

// ─── PATCH /api/qr-codes/:id/category ────────────────────────────────────────

describe('PATCH /api/qr-codes/:id/category', () => {
  let token, qrId;
  beforeEach(async () => {
    token = await registerAndLogin();
    const res = await createQR(token);
    qrId = res.body.qrCode._id;
  });

  it('updates category to work', async () => {
    const res = await request(app)
      .patch(`/api/qr-codes/${qrId}/category`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'work' });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('work');
  });

  it('returns 400 for invalid category', async () => {
    const res = await request(app)
      .patch(`/api/qr-codes/${qrId}/category`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'invalid_category' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/qr-codes/:id/analytics ─────────────────────────────────────────

describe('GET /api/qr-codes/:id/analytics', () => {
  let token, qrId;
  beforeEach(async () => {
    token = await registerAndLogin();
    const res = await createQR(token);
    qrId = res.body.qrCode._id;
  });

  it('returns analytics object with expected shape', async () => {
    const res = await request(app)
      .get(`/api/qr-codes/${qrId}/analytics`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics).toBeDefined();
    expect(Array.isArray(res.body.analytics.timeSeries)).toBe(true);
    expect(Array.isArray(res.body.analytics.devices)).toBe(true);
    expect(Array.isArray(res.body.analytics.os)).toBe(true);
    expect(Array.isArray(res.body.analytics.browsers)).toBe(true);
    expect(Array.isArray(res.body.analytics.countries)).toBe(true);
  });
});

// ─── GET /r/:shortId (Dynamic QR Redirect) ───────────────────────────────────

describe('GET /r/:shortId', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('redirects to targetUrl for a valid dynamic QR', async () => {
    const created = await createQR(token, {
      type: 'url',
      content: 'https://google.com',
      isDynamic: true
    });
    const { shortId } = created.body.qrCode;

    const res = await request(app).get(`/r/${shortId}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://google.com');
  });

  it('returns 404 for non-existent shortId', async () => {
    const res = await request(app).get('/r/nonexistent99');
    expect(res.status).toBe(404);
  });

  it('returns 422 if dynamic QR has no targetUrl', async () => {
    // Create dynamic QR then manually remove targetUrl by creating with null content
    const created = await createQR(token, {
      type: 'url',
      content: 'https://original.com',
      isDynamic: true
    });
    const { shortId, _id: qrId } = created.body.qrCode;

    // Update to clear targetUrl
    const QRCode = require('../models/QRCode');
    await QRCode.findByIdAndUpdate(qrId, { $set: { targetUrl: null } });

    const res = await request(app).get(`/r/${shortId}`);
    expect(res.status).toBe(422);
  });

  it('increments scanCount on redirect', async () => {
    const created = await createQR(token, {
      type: 'url',
      content: 'https://example.com',
      isDynamic: true
    });
    const { shortId, _id: qrId } = created.body.qrCode;

    await request(app).get(`/r/${shortId}`);

    const QRCode = require('../models/QRCode');
    const qr = await QRCode.findById(qrId);
    expect(qr.scanCount).toBe(1);
  });
});

// ─── POST /api/qr-codes/bulk ─────────────────────────────────────────────────

describe('POST /api/qr-codes/bulk', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('generates a ZIP file with QR codes', async () => {
    const res = await request(app)
      .post('/api/qr-codes/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { name: 'First', content: 'https://one.com' },
          { name: 'Second', content: 'https://two.com' }
        ],
        format: 'png'
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('zip');
  });

  it('returns 400 for empty items array', async () => {
    const res = await request(app)
      .post('/api/qr-codes/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing items', async () => {
    const res = await request(app)
      .post('/api/qr-codes/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
