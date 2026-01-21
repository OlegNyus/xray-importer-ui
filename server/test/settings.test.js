import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the fileOperations module
vi.mock('../utils/fileOperations.js', () => ({
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
  getProjectSettings: vi.fn(),
  saveProjectSettings: vi.fn(),
  addProject: vi.fn(),
  hideProject: vi.fn(),
  unhideProject: vi.fn(),
  setActiveProject: vi.fn(),
  getSettingsSynced: vi.fn(),
}));

import {
  readSettings,
  writeSettings,
  getProjectSettings,
  saveProjectSettings,
  addProject,
  hideProject,
  unhideProject,
  setActiveProject,
  getSettingsSynced,
} from '../utils/fileOperations.js';
import settingsRouter from '../routes/settings.js';

const app = express();
app.use(express.json());
app.use('/settings', settingsRouter);

describe('Settings Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set default return values
    readSettings.mockReturnValue({});
    getProjectSettings.mockReturnValue({});
  });

  // ============ Global Settings ============
  describe('GET /settings', () => {
    it('should return settings', async () => {
      const mockSettings = { projects: ['PROJ1'], activeProject: 'PROJ1' };
      readSettings.mockReturnValue(mockSettings);

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settings).toEqual(mockSettings);
    });

    it('should handle errors', async () => {
      readSettings.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const response = await request(app).get('/settings');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to read settings');
    });
  });

  describe('PUT /settings', () => {
    it('should update settings', async () => {
      const newSettings = { projects: ['PROJ1', 'PROJ2'] };

      const response = await request(app)
        .put('/settings')
        .send({ settings: newSettings });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(writeSettings).toHaveBeenCalledWith(newSettings);
    });

    it('should return 400 if settings not provided', async () => {
      const response = await request(app).put('/settings').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Settings required');
    });

    it('should handle errors', async () => {
      writeSettings.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const response = await request(app)
        .put('/settings')
        .send({ settings: {} });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to save settings');
    });
  });

  // ============ Project Management ============
  describe('GET /settings/projects', () => {
    it('should return projects list', async () => {
      const mockSettings = {
        projects: ['PROJ1', 'PROJ2'],
        hiddenProjects: ['HIDDEN'],
        activeProject: 'PROJ1',
        projectSettings: { PROJ1: { color: '#a5c7e9' } },
      };
      getSettingsSynced.mockReturnValue(mockSettings);

      const response = await request(app).get('/settings/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.projects).toEqual(['PROJ1', 'PROJ2']);
      expect(response.body.hiddenProjects).toEqual(['HIDDEN']);
      expect(response.body.activeProject).toBe('PROJ1');
    });

    it('should handle missing arrays gracefully', async () => {
      getSettingsSynced.mockReturnValue({});

      const response = await request(app).get('/settings/projects');

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);
      expect(response.body.hiddenProjects).toEqual([]);
      expect(response.body.projectSettings).toEqual({});
    });

    it('should handle errors', async () => {
      getSettingsSynced.mockImplementation(() => {
        throw new Error('Sync failed');
      });

      const response = await request(app).get('/settings/projects');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to read projects');
    });
  });

  describe('POST /settings/projects', () => {
    it('should add a new project', async () => {
      addProject.mockReturnValue({ alreadyExists: false });
      readSettings.mockReturnValue({
        projects: ['PROJ1', 'NEWPROJ'],
        activeProject: 'NEWPROJ',
        projectSettings: { PROJ1: {}, NEWPROJ: { color: '#a8e6cf' } },
      });

      const response = await request(app)
        .post('/settings/projects')
        .send({ projectKey: 'NEWPROJ', color: '#a8e6cf' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(addProject).toHaveBeenCalledWith('NEWPROJ', '#a8e6cf');
    });

    it('should return alreadyExists flag', async () => {
      addProject.mockReturnValue({ alreadyExists: true });
      readSettings.mockReturnValue({
        projects: ['EXISTING'],
        activeProject: 'EXISTING',
        projectSettings: {},
      });

      const response = await request(app)
        .post('/settings/projects')
        .send({ projectKey: 'EXISTING' });

      expect(response.status).toBe(200);
      expect(response.body.alreadyExists).toBe(true);
    });

    it('should reject invalid project key - lowercase', async () => {
      const response = await request(app)
        .post('/settings/projects')
        .send({ projectKey: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project key must be uppercase letters only');
    });

    it('should reject invalid project key - numbers', async () => {
      const response = await request(app)
        .post('/settings/projects')
        .send({ projectKey: 'PROJ123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project key must be uppercase letters only');
    });

    it('should reject empty project key', async () => {
      const response = await request(app)
        .post('/settings/projects')
        .send({ projectKey: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project key must be uppercase letters only');
    });

    it('should reject missing project key', async () => {
      const response = await request(app).post('/settings/projects').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project key must be uppercase letters only');
    });

    it('should handle errors', async () => {
      addProject.mockImplementation(() => {
        throw new Error('Add failed');
      });

      const response = await request(app)
        .post('/settings/projects')
        .send({ projectKey: 'FAIL' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add project');
    });
  });

  describe('POST /settings/projects/:projectKey/hide', () => {
    it('should hide a project', async () => {
      readSettings.mockReturnValue({
        hiddenProjects: ['PROJ1'],
        activeProject: 'PROJ2',
      });

      const response = await request(app).post('/settings/projects/PROJ1/hide');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(hideProject).toHaveBeenCalledWith('PROJ1');
      expect(response.body.hiddenProjects).toEqual(['PROJ1']);
    });

    it('should handle errors', async () => {
      hideProject.mockImplementation(() => {
        throw new Error('Hide failed');
      });

      const response = await request(app).post('/settings/projects/PROJ1/hide');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to hide project');
    });
  });

  describe('POST /settings/projects/:projectKey/unhide', () => {
    it('should unhide a project', async () => {
      readSettings.mockReturnValue({
        hiddenProjects: [],
      });

      const response = await request(app).post('/settings/projects/PROJ1/unhide');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(unhideProject).toHaveBeenCalledWith('PROJ1');
    });

    it('should handle errors', async () => {
      unhideProject.mockImplementation(() => {
        throw new Error('Unhide failed');
      });

      const response = await request(app).post('/settings/projects/PROJ1/unhide');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to unhide project');
    });
  });

  describe('POST /settings/projects/:projectKey/activate', () => {
    it('should set active project', async () => {
      setActiveProject.mockReturnValue({ success: true });

      const response = await request(app).post('/settings/projects/PROJ1/activate');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.activeProject).toBe('PROJ1');
    });

    it('should return 404 if project not found', async () => {
      setActiveProject.mockReturnValue({ success: false, error: 'Project not found' });

      const response = await request(app).post('/settings/projects/UNKNOWN/activate');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    it('should handle errors', async () => {
      setActiveProject.mockImplementation(() => {
        throw new Error('Activate failed');
      });

      const response = await request(app).post('/settings/projects/PROJ1/activate');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to set active project');
    });
  });

  describe('GET /settings/projects/:projectKey', () => {
    it('should return project settings', async () => {
      const projectSettings = { color: '#a5c7e9', functionalAreas: ['UI'] };
      getProjectSettings.mockReturnValue(projectSettings);

      const response = await request(app).get('/settings/projects/PROJ1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.projectKey).toBe('PROJ1');
      expect(response.body.settings).toEqual(projectSettings);
    });

    it('should handle errors', async () => {
      getProjectSettings.mockImplementation(() => {
        throw new Error('Get failed');
      });

      const response = await request(app).get('/settings/projects/PROJ1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to get project settings');
    });
  });

  describe('PUT /settings/projects/:projectKey', () => {
    it('should update project settings', async () => {
      const newSettings = { color: '#a8e6cf', functionalAreas: ['API'] };

      const response = await request(app)
        .put('/settings/projects/PROJ1')
        .send({ settings: newSettings });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(saveProjectSettings).toHaveBeenCalledWith('PROJ1', newSettings);
    });

    it('should return 400 if settings not provided', async () => {
      const response = await request(app)
        .put('/settings/projects/PROJ1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Settings required');
    });

    it('should handle errors', async () => {
      saveProjectSettings.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const response = await request(app)
        .put('/settings/projects/PROJ1')
        .send({ settings: {} });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to save project settings');
    });
  });

  // ============ Functional Areas ============
  describe('GET /settings/functional-areas', () => {
    it('should return functional areas for specified project', async () => {
      getProjectSettings.mockReturnValue({ functionalAreas: ['UI', 'API'] });

      const response = await request(app)
        .get('/settings/functional-areas')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(200);
      expect(response.body.areas).toEqual(['UI', 'API']);
    });

    it('should return functional areas from active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ functionalAreas: ['Backend'] });

      const response = await request(app).get('/settings/functional-areas');

      expect(response.status).toBe(200);
      expect(response.body.areas).toEqual(['Backend']);
    });

    it('should return global functional areas if no active project', async () => {
      readSettings.mockReturnValue({ functionalAreas: ['Global'] });

      const response = await request(app).get('/settings/functional-areas');

      expect(response.status).toBe(200);
      expect(response.body.areas).toEqual(['Global']);
    });

    it('should handle errors', async () => {
      getProjectSettings.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const response = await request(app)
        .get('/settings/functional-areas')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to read functional areas');
    });
  });

  describe('PUT /settings/functional-areas', () => {
    it('should update functional areas for specified project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ functionalAreas: [] });

      const response = await request(app)
        .put('/settings/functional-areas')
        .query({ project: 'PROJ1' })
        .send({ areas: ['UI', 'API'] });

      expect(response.status).toBe(200);
      expect(saveProjectSettings).toHaveBeenCalled();
    });

    it('should update functional areas for active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({});

      const response = await request(app)
        .put('/settings/functional-areas')
        .send({ areas: ['Backend'] });

      expect(response.status).toBe(200);
      expect(saveProjectSettings).toHaveBeenCalledWith('PROJ1', { functionalAreas: ['Backend'] });
    });

    it('should update global settings if no project', async () => {
      readSettings.mockReturnValue({});

      const response = await request(app)
        .put('/settings/functional-areas')
        .send({ areas: ['Global'] });

      expect(response.status).toBe(200);
      expect(writeSettings).toHaveBeenCalledWith({ functionalAreas: ['Global'] });
    });

    it('should return 400 if areas is not an array', async () => {
      const response = await request(app)
        .put('/settings/functional-areas')
        .send({ areas: 'not-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Areas must be an array');
    });

    it('should handle errors', async () => {
      readSettings.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const response = await request(app)
        .put('/settings/functional-areas')
        .send({ areas: [] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to save functional areas');
    });
  });

  // ============ Labels ============
  describe('GET /settings/labels', () => {
    it('should return labels for specified project', async () => {
      getProjectSettings.mockReturnValue({ labels: ['smoke', 'regression'] });

      const response = await request(app)
        .get('/settings/labels')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(200);
      expect(response.body.labels).toEqual(['smoke', 'regression']);
    });

    it('should return labels from active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ labels: ['sanity'] });

      const response = await request(app).get('/settings/labels');

      expect(response.status).toBe(200);
      expect(response.body.labels).toEqual(['sanity']);
    });

    it('should return global labels if no active project', async () => {
      readSettings.mockReturnValue({ labels: ['global-label'] });

      const response = await request(app).get('/settings/labels');

      expect(response.status).toBe(200);
      expect(response.body.labels).toEqual(['global-label']);
    });

    it('should handle errors', async () => {
      getProjectSettings.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const response = await request(app)
        .get('/settings/labels')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to read labels');
    });
  });

  describe('PUT /settings/labels', () => {
    it('should update labels for specified project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ labels: [] });

      const response = await request(app)
        .put('/settings/labels')
        .query({ project: 'PROJ1' })
        .send({ labels: ['smoke', 'regression'] });

      expect(response.status).toBe(200);
      expect(saveProjectSettings).toHaveBeenCalled();
    });

    it('should update labels for active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({});

      const response = await request(app)
        .put('/settings/labels')
        .send({ labels: ['sanity'] });

      expect(response.status).toBe(200);
      expect(saveProjectSettings).toHaveBeenCalledWith('PROJ1', { labels: ['sanity'] });
    });

    it('should update global settings if no project', async () => {
      readSettings.mockReturnValue({});

      const response = await request(app)
        .put('/settings/labels')
        .send({ labels: ['global'] });

      expect(response.status).toBe(200);
      expect(writeSettings).toHaveBeenCalledWith({ labels: ['global'] });
    });

    it('should return 400 if labels is not an array', async () => {
      const response = await request(app)
        .put('/settings/labels')
        .send({ labels: 'not-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Labels must be an array');
    });

    it('should handle errors', async () => {
      readSettings.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const response = await request(app)
        .put('/settings/labels')
        .send({ labels: [] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to save labels');
    });
  });

  // ============ Collections ============
  describe('GET /settings/collections', () => {
    it('should return collections for specified project', async () => {
      const collections = [{ id: 'col-1', name: 'Sprint 1', color: '#6366f1' }];
      getProjectSettings.mockReturnValue({ collections });

      const response = await request(app)
        .get('/settings/collections')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(200);
      expect(response.body.collections).toEqual(collections);
    });

    it('should return collections from active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ collections: [{ id: 'col-2', name: 'Sprint 2' }] });

      const response = await request(app).get('/settings/collections');

      expect(response.status).toBe(200);
      expect(response.body.collections).toHaveLength(1);
    });

    it('should return global collections if no active project', async () => {
      readSettings.mockReturnValue({ collections: [{ id: 'global', name: 'Global Collection' }] });

      const response = await request(app).get('/settings/collections');

      expect(response.status).toBe(200);
      expect(response.body.collections[0].name).toBe('Global Collection');
    });

    it('should handle errors', async () => {
      getProjectSettings.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const response = await request(app)
        .get('/settings/collections')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to read collections');
    });
  });

  describe('PUT /settings/collections', () => {
    it('should update collections for specified project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ collections: [] });

      const collections = [{ id: 'col-1', name: 'Sprint 1', color: '#6366f1' }];

      const response = await request(app)
        .put('/settings/collections')
        .query({ project: 'PROJ1' })
        .send({ collections });

      expect(response.status).toBe(200);
      expect(saveProjectSettings).toHaveBeenCalled();
    });

    it('should update collections for active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({});

      const collections = [{ id: 'col-1', name: 'Sprint 1' }];

      const response = await request(app)
        .put('/settings/collections')
        .send({ collections });

      expect(response.status).toBe(200);
      expect(saveProjectSettings).toHaveBeenCalledWith('PROJ1', { collections });
    });

    it('should update global settings if no project', async () => {
      readSettings.mockReturnValue({});

      const collections = [{ id: 'global', name: 'Global' }];

      const response = await request(app)
        .put('/settings/collections')
        .send({ collections });

      expect(response.status).toBe(200);
      expect(writeSettings).toHaveBeenCalledWith({ collections });
    });

    it('should return 400 if collections is not an array', async () => {
      const response = await request(app)
        .put('/settings/collections')
        .send({ collections: 'not-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Collections must be an array');
    });

    it('should handle errors', async () => {
      readSettings.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const response = await request(app)
        .put('/settings/collections')
        .send({ collections: [] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to save collections');
    });
  });

  describe('POST /settings/collections', () => {
    it('should create a collection for specified project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ collections: [] });

      const response = await request(app)
        .post('/settings/collections')
        .query({ project: 'PROJ1' })
        .send({ name: 'Sprint 1', color: '#6366f1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.collection.name).toBe('Sprint 1');
      expect(response.body.collection.color).toBe('#6366f1');
      expect(response.body.collection.id).toMatch(/^col-/);
    });

    it('should create a collection for active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ collections: [] });

      const response = await request(app)
        .post('/settings/collections')
        .send({ name: 'Sprint 2' });

      expect(response.status).toBe(200);
      expect(response.body.collection.name).toBe('Sprint 2');
      expect(response.body.collection.color).toBe('#6366f1'); // Default color
    });

    it('should create a collection in global settings if no project', async () => {
      readSettings.mockReturnValue({});

      const response = await request(app)
        .post('/settings/collections')
        .send({ name: 'Global Collection' });

      expect(response.status).toBe(200);
      expect(writeSettings).toHaveBeenCalled();
    });

    it('should return 400 if name not provided', async () => {
      const response = await request(app)
        .post('/settings/collections')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Collection name is required');
    });

    it('should return 400 if name is not a string', async () => {
      const response = await request(app)
        .post('/settings/collections')
        .send({ name: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Collection name is required');
    });

    it('should handle errors', async () => {
      readSettings.mockImplementation(() => {
        throw new Error('Create failed');
      });

      const response = await request(app)
        .post('/settings/collections')
        .send({ name: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create collection');
    });
  });

  describe('DELETE /settings/collections/:id', () => {
    it('should delete a collection from specified project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      const collections = [
        { id: 'col-1', name: 'Sprint 1' },
        { id: 'col-2', name: 'Sprint 2' },
      ];
      getProjectSettings.mockReturnValue({ collections: [...collections] });

      const response = await request(app)
        .delete('/settings/collections/col-1')
        .query({ project: 'PROJ1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(saveProjectSettings).toHaveBeenCalled();
    });

    it('should delete a collection from active project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ collections: [{ id: 'col-1', name: 'Sprint 1' }] });

      const response = await request(app).delete('/settings/collections/col-1');

      expect(response.status).toBe(200);
      expect(response.body.collections).toHaveLength(0);
    });

    it('should delete a collection from global settings if no project', async () => {
      readSettings.mockReturnValue({ collections: [{ id: 'col-1', name: 'Global' }] });

      const response = await request(app).delete('/settings/collections/col-1');

      expect(response.status).toBe(200);
      expect(writeSettings).toHaveBeenCalled();
    });

    it('should return 404 if collection not found in project', async () => {
      readSettings.mockReturnValue({ activeProject: 'PROJ1' });
      getProjectSettings.mockReturnValue({ collections: [] });

      const response = await request(app).delete('/settings/collections/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Collection not found');
    });

    it('should return 404 if collection not found in global settings', async () => {
      readSettings.mockReturnValue({ collections: [] });

      const response = await request(app).delete('/settings/collections/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Collection not found');
    });

    it('should handle errors', async () => {
      readSettings.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const response = await request(app).delete('/settings/collections/col-1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete collection');
    });
  });
});
