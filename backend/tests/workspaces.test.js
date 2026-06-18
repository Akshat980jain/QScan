/**
 * workspaces.test.js — Integration tests for /api/workspaces/*
 *
 * Covers: create, list, add/list/remove members, delete.
 */
const request = require('supertest');
const app = require('../app');
const db = require('./testDb');

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (suffix) => ({
  name: `User ${suffix}`,
  email: `user${suffix}@example.com`,
  password: 'Password123',
  accountType: 'individual',
  subscribeToNewsletter: false,
  agreeToTerms: true
});

async function registerAndLogin(suffix = 'A') {
  const user = makeUser(suffix);
  await request(app).post('/api/auth/register').send(user);
  const res = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: user.password
  });
  return { token: res.body.token, email: user.email };
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

// ─── POST /api/workspaces ─────────────────────────────────────────────────────

describe('POST /api/workspaces', () => {
  let token;
  beforeEach(async () => { ({ token } = await registerAndLogin('1')); });

  it('creates a workspace and adds owner as member', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Workspace' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.workspace.name).toBe('My Workspace');
  });

  it('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/workspaces ──────────────────────────────────────────────────────

describe('GET /api/workspaces', () => {
  let token;
  beforeEach(async () => { ({ token } = await registerAndLogin('2')); });

  it('returns empty list when no workspaces', async () => {
    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.workspaces).toEqual([]);
  });

  it('lists workspaces user belongs to', async () => {
    await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'WS 1' });

    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.workspaces.length).toBe(1);
    expect(res.body.workspaces[0].name).toBe('WS 1');
    // Should include the user's role
    expect(res.body.workspaces[0].role).toBe('owner');
  });
});

// ─── POST /api/workspaces/:id/members ────────────────────────────────────────

describe('POST /api/workspaces/:id/members', () => {
  let ownerToken, workspaceId, memberEmail;

  beforeEach(async () => {
    ({ token: ownerToken } = await registerAndLogin('3'));
    // Register a second user (member to-be-invited)
    const { email } = await registerAndLogin('4');
    memberEmail = email;

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Collab WS' });
    workspaceId = wsRes.body.workspace._id;
  });

  it('adds a member by email', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'editor' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.member.email).toBe(memberEmail);
    expect(res.body.member.role).toBe('editor');
  });

  it('returns 404 for non-existent user email', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'nobody@fake.com', role: 'viewer' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for duplicate member', async () => {
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'viewer' });

    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'viewer' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if email is missing', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/workspaces/:id/members ─────────────────────────────────────────

describe('GET /api/workspaces/:id/members', () => {
  let ownerToken, workspaceId;

  beforeEach(async () => {
    ({ token: ownerToken } = await registerAndLogin('5'));
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Members WS' });
    workspaceId = wsRes.body.workspace._id;
  });

  it('lists workspace members', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.members.length).toBe(1); // Only owner
    expect(res.body.members[0].role).toBe('owner');
  });

  it('returns 403 for non-member', async () => {
    const { token: outsiderToken } = await registerAndLogin('6');
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/workspaces/:id/members/:userId ───────────────────────────────

describe('DELETE /api/workspaces/:id/members/:userId', () => {
  let ownerToken, memberToken, memberId, workspaceId;

  beforeEach(async () => {
    ({ token: ownerToken } = await registerAndLogin('7'));
    const memberRes = await registerAndLogin('8');
    memberToken = memberRes.token;

    // Get member's userId from /me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${memberToken}`);
    memberId = meRes.body.user._id;

    // Create workspace and invite member
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Remove Member WS' });
    workspaceId = wsRes.body.workspace._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberRes.email, role: 'viewer' });
  });

  it('owner can remove a member', async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('member can remove themselves (leave)', async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('left');
  });
});

// ─── DELETE /api/workspaces/:id ───────────────────────────────────────────────

describe('DELETE /api/workspaces/:id', () => {
  let ownerToken, workspaceId;

  beforeEach(async () => {
    ({ token: ownerToken } = await registerAndLogin('9'));
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Delete Me' });
    workspaceId = wsRes.body.workspace._id;
  });

  it('owner can delete workspace', async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Workspace should no longer appear in list
    const listRes = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listRes.body.workspaces.length).toBe(0);
  });

  it('non-owner cannot delete workspace', async () => {
    const { token: outsider } = await registerAndLogin('10');
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${outsider}`);
    expect(res.status).toBe(403);
  });
});
