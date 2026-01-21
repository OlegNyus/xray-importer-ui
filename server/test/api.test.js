import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';

// Mock xrayClient to avoid real API calls during tests
vi.mock('../utils/xrayClient.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    validateCredentials: vi.fn().mockResolvedValue({ success: true }),
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Test file paths
const TEST_CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'xray-config.json');
const TEST_SETTINGS_PATH = path.join(PROJECT_ROOT, 'config', 'settings.json');
const TEST_DRAFTS_DIR = path.join(PROJECT_ROOT, 'testCases');

// Backup paths
const BACKUP_DIR = path.join(PROJECT_ROOT, 'config', '.test-backup');

let app;
let backupConfig = null;
let backupSettings = null;
let originalDrafts = [];

// Helper to backup and restore files
function backupFiles() {
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Backup config
  if (fs.existsSync(TEST_CONFIG_PATH)) {
    backupConfig = fs.readFileSync(TEST_CONFIG_PATH, 'utf8');
  }

  // Backup settings
  if (fs.existsSync(TEST_SETTINGS_PATH)) {
    backupSettings = fs.readFileSync(TEST_SETTINGS_PATH, 'utf8');
  }

  // Backup drafts
  if (fs.existsSync(TEST_DRAFTS_DIR)) {
    const files = fs.readdirSync(TEST_DRAFTS_DIR).filter(f => f.endsWith('.json'));
    originalDrafts = files.map(f => ({
      name: f,
      content: fs.readFileSync(path.join(TEST_DRAFTS_DIR, f), 'utf8'),
    }));
  }
}

function restoreFiles() {
  // Restore config
  if (backupConfig) {
    fs.writeFileSync(TEST_CONFIG_PATH, backupConfig);
  }

  // Restore settings
  if (backupSettings) {
    fs.writeFileSync(TEST_SETTINGS_PATH, backupSettings);
  }

  // Clean up test drafts and restore originals
  if (fs.existsSync(TEST_DRAFTS_DIR)) {
    const currentFiles = fs.readdirSync(TEST_DRAFTS_DIR).filter(f => f.endsWith('.json'));
    const originalNames = originalDrafts.map(d => d.name);

    // Remove files created during tests
    currentFiles.forEach(f => {
      if (!originalNames.includes(f)) {
        fs.unlinkSync(path.join(TEST_DRAFTS_DIR, f));
      }
    });

    // Restore original content
    originalDrafts.forEach(d => {
      fs.writeFileSync(path.join(TEST_DRAFTS_DIR, d.name), d.content);
    });
  }

  // Clean up backup directory
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true });
  }
}

describe('Server API', () => {
  beforeAll(() => {
    app = createApp();
    backupFiles();
  });

  afterAll(() => {
    restoreFiles();
  });

  describe('Health Check', () => {
    it('GET /api/health should return ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Config API', () => {
    it('GET /api/config should return config existence status', async () => {
      const res = await request(app).get('/api/config');
      // Either exists or doesn't
      expect([200, 404]).toContain(res.status);
      expect(typeof res.body.exists).toBe('boolean');
    });

    it('POST /api/config should validate required fields', async () => {
      const res = await request(app)
        .post('/api/config')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/config should save valid config', async () => {
      // Config no longer includes projectKey - that's managed separately
      const config = {
        xrayClientId: 'test-client-id',
        xrayClientSecret: 'test-client-secret',
        jiraBaseUrl: 'https://test.atlassian.net/',
      };

      const res = await request(app)
        .post('/api/config')
        .send(config);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/config should reject invalid credentials', async () => {
      // Import and mock validateCredentials to return failure for this test
      const xrayClient = await import('../utils/xrayClient.js');
      xrayClient.validateCredentials.mockResolvedValueOnce({
        success: false,
        error: 'Invalid Client ID or Client Secret',
      });

      const config = {
        xrayClientId: 'invalid-client-id',
        xrayClientSecret: 'invalid-secret',
        jiraBaseUrl: 'https://test.atlassian.net/',
      };

      const res = await request(app)
        .post('/api/config')
        .send(config);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('POST /api/config should reject invalid URL', async () => {
      const config = {
        xrayClientId: 'test-client-id',
        xrayClientSecret: 'test-client-secret',
        jiraBaseUrl: 'not-a-valid-url',
      };

      const res = await request(app)
        .post('/api/config')
        .send(config);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // Note: projectKey validation is no longer part of config - it's managed in project settings
  });

  describe('Settings API', () => {
    describe('Functional Areas', () => {
      it('GET /api/settings/functional-areas should return areas', async () => {
        const res = await request(app).get('/api/settings/functional-areas');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.areas)).toBe(true);
      });

      it('PUT /api/settings/functional-areas should save areas', async () => {
        const areas = ['TestArea1', 'TestArea2'];
        const res = await request(app)
          .put('/api/settings/functional-areas')
          .send({ areas });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('PUT /api/settings/functional-areas should reject non-array', async () => {
        const res = await request(app)
          .put('/api/settings/functional-areas')
          .send({ areas: 'not-an-array' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Labels', () => {
      it('GET /api/settings/labels should return labels', async () => {
        const res = await request(app).get('/api/settings/labels');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.labels)).toBe(true);
      });

      it('PUT /api/settings/labels should save labels', async () => {
        const labels = ['TestLabel1', 'TestLabel2'];
        const res = await request(app)
          .put('/api/settings/labels')
          .send({ labels });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('PUT /api/settings/labels should reject non-array', async () => {
        const res = await request(app)
          .put('/api/settings/labels')
          .send({ labels: 'not-an-array' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Collections', () => {
      let testCollectionId;

      it('GET /api/settings/collections should return collections', async () => {
        const res = await request(app).get('/api/settings/collections');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.collections)).toBe(true);
      });

      it('POST /api/settings/collections should create collection', async () => {
        const res = await request(app)
          .post('/api/settings/collections')
          .send({ name: 'Test Collection', color: '#ff0000' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.collection.name).toBe('Test Collection');
        expect(res.body.collection.color).toBe('#ff0000');
        expect(res.body.collection.id).toBeDefined();
        testCollectionId = res.body.collection.id;
      });

      it('POST /api/settings/collections should reject missing name', async () => {
        const res = await request(app)
          .post('/api/settings/collections')
          .send({ color: '#ff0000' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('PUT /api/settings/collections should save collections', async () => {
        const res = await request(app)
          .put('/api/settings/collections')
          .send({ collections: [{ id: 'col-1', name: 'Updated', color: '#00ff00' }] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('PUT /api/settings/collections should reject non-array', async () => {
        const res = await request(app)
          .put('/api/settings/collections')
          .send({ collections: 'not-an-array' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('DELETE /api/settings/collections/:id should delete collection', async () => {
        // First create a collection to delete
        const createRes = await request(app)
          .post('/api/settings/collections')
          .send({ name: 'To Delete', color: '#000000' });
        const idToDelete = createRes.body.collection.id;

        const res = await request(app)
          .delete(`/api/settings/collections/${idToDelete}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('DELETE /api/settings/collections/:id should return 404 for unknown id', async () => {
        const res = await request(app)
          .delete('/api/settings/collections/unknown-id');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Drafts API', () => {
    let testDraftId;

    it('GET /api/drafts should return drafts array', async () => {
      const res = await request(app).get('/api/drafts');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.drafts)).toBe(true);
    });

    it('POST /api/drafts should create a new draft', async () => {
      const draft = {
        summary: 'Test Summary',
        description: 'Test Description',
        testType: 'Manual',
        labels: ['test'],
        steps: [{ action: 'Do something', data: '', result: 'Expected result' }],
      };

      // projectKey is now required - pass via query param
      const res = await request(app)
        .post('/api/drafts?project=TEST')
        .send({ draft });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBeDefined();
      expect(res.body.draft.summary).toBe('Test Summary');
      expect(res.body.draft.projectKey).toBe('TEST');

      testDraftId = res.body.id;
    });

    it('POST /api/drafts should reject empty request', async () => {
      const res = await request(app)
        .post('/api/drafts')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/drafts/:id should return a specific draft', async () => {
      if (!testDraftId) return;

      const res = await request(app).get(`/api/drafts/${testDraftId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.draft.id).toBe(testDraftId);
    });

    it('GET /api/drafts/:id should return 404 for non-existent draft', async () => {
      const res = await request(app).get('/api/drafts/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/drafts/:id should update a draft', async () => {
      if (!testDraftId) return;

      const updatedDraft = {
        summary: 'Updated Summary',
        description: 'Updated Description',
        testType: 'Manual',
        labels: ['updated'],
        steps: [{ action: 'Updated action', data: '', result: 'Updated result' }],
      };

      const res = await request(app)
        .put(`/api/drafts/${testDraftId}`)
        .send({ draft: updatedDraft });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.draft.summary).toBe('Updated Summary');
    });

    it('PUT /api/drafts/:id should return 404 for non-existent draft', async () => {
      const res = await request(app)
        .put('/api/drafts/non-existent-id')
        .send({ draft: { summary: 'Test' } });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/drafts/:id should reject empty request', async () => {
      if (!testDraftId) return;

      const res = await request(app)
        .put(`/api/drafts/${testDraftId}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /api/drafts/:id/status should update draft status', async () => {
      if (!testDraftId) return;

      const res = await request(app)
        .patch(`/api/drafts/${testDraftId}/status`)
        .send({ status: 'imported' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.draft.status).toBe('imported');
    });

    it('PATCH /api/drafts/:id/status should reject invalid status', async () => {
      if (!testDraftId) return;

      const res = await request(app)
        .patch(`/api/drafts/${testDraftId}/status`)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /api/drafts/:id/status should return 404 for non-existent draft', async () => {
      const res = await request(app)
        .patch('/api/drafts/non-existent-id/status')
        .send({ status: 'draft' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /api/drafts/:id should delete a draft', async () => {
      if (!testDraftId) return;

      const res = await request(app).delete(`/api/drafts/${testDraftId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/drafts/:id should return 404 for non-existent draft', async () => {
      const res = await request(app).delete('/api/drafts/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Drafts Import API', () => {
    let completeDraftId;

    beforeAll(async () => {
      // Create a complete draft for import testing
      const draft = {
        summary: 'Complete Test Case',
        description: 'Full description for import',
        testType: 'Manual',
        labels: ['import-test'],
        steps: [
          { action: 'Step 1 action', data: '', result: 'Step 1 result' },
        ],
      };

      // projectKey is required - pass via query param
      const res = await request(app)
        .post('/api/drafts?project=TEST')
        .send({ draft });

      completeDraftId = res.body.id;
    });

    afterAll(async () => {
      if (completeDraftId) {
        await request(app).delete(`/api/drafts/${completeDraftId}`);
      }
    });

    it('POST /api/drafts/:id/import should reject incomplete draft', async () => {
      // Create incomplete draft (with projectKey via query param)
      const incompleteDraft = {
        summary: '',
        description: '',
        steps: [],
      };

      const createRes = await request(app)
        .post('/api/drafts?project=TEST')
        .send({ draft: incompleteDraft });

      const incompleteId = createRes.body.id;

      const res = await request(app)
        .post(`/api/drafts/${incompleteId}/import`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // Cleanup
      await request(app).delete(`/api/drafts/${incompleteId}`);
    });

    it('POST /api/drafts/:id/import should return 404 for non-existent draft', async () => {
      const res = await request(app)
        .post('/api/drafts/non-existent-id/import');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/drafts/bulk-import should reject empty ids array', async () => {
      const res = await request(app)
        .post('/api/drafts/bulk-import')
        .send({ ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/drafts/bulk-import should reject non-array ids', async () => {
      const res = await request(app)
        .post('/api/drafts/bulk-import')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/drafts/bulk-import should return 404 for non-existent draft', async () => {
      const res = await request(app)
        .post('/api/drafts/bulk-import')
        .send({ ids: ['non-existent-id'] });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Drafts Migration API', () => {
    it('POST /api/drafts/migrate should migrate test cases', async () => {
      const testCases = [
        {
          summary: 'Migrated Test Case',
          description: 'Description',
          steps: [],
          projectKey: 'TEST', // Include projectKey for migration
        },
      ];

      const res = await request(app)
        .post('/api/drafts/migrate')
        .send({ testCases });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.migrated).toBe(1);
      expect(res.body.ids.length).toBe(1);

      // Cleanup
      await request(app).delete(`/api/drafts/${res.body.ids[0]}`);
    });

    it('POST /api/drafts/migrate should reject non-array', async () => {
      const res = await request(app)
        .post('/api/drafts/migrate')
        .send({ testCases: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
