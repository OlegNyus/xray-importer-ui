import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchConfig,
  saveConfig,
  fetchDrafts,
  fetchDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  updateDraftStatus,
  importDraft,
  bulkImportDrafts,
  migrateDrafts,
  fetchFunctionalAreas,
  saveFunctionalAreas,
  fetchLabels,
  saveLabels,
  fetchCollections,
  createCollection,
  deleteCollection,
  fetchProjects,
  addProject,
  hideProject,
  unhideProject,
  setActiveProject,
  fetchProjectSettings,
  saveProjectSettings,
  fetchTestPlans,
  fetchTestExecutions,
  fetchTestSets,
  fetchPreconditions,
  fetchFolders,
  linkTestToEntities,
  updateTestLinks,
  updateDraftXrayLinks,
} from './api';

describe('API utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSuccessResponse = (data) => ({
    ok: true,
    json: () => Promise.resolve(data),
  });

  const mockErrorResponse = (status, error) => ({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });

  describe('fetchConfig', () => {
    it('should fetch config successfully', async () => {
      const mockConfig = { exists: true, config: { projectKey: 'PROJ' } };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockConfig));

      const result = await fetchConfig();

      expect(fetch).toHaveBeenCalledWith('/api/config');
      expect(result).toEqual(mockConfig);
    });

    it('should throw error on failed response', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(404, 'Config not found'));

      await expect(fetchConfig()).rejects.toThrow('Config not found');
    });

    it('should throw generic error when no error message provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(fetchConfig()).rejects.toThrow('Request failed with status 500');
    });
  });

  describe('saveConfig', () => {
    it('should save config successfully', async () => {
      const config = { xrayClientId: 'test', xrayClientSecret: 'secret' };
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await saveConfig(config);

      expect(fetch).toHaveBeenCalledWith('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed save', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(400, 'Validation failed'));

      await expect(saveConfig({})).rejects.toThrow('Validation failed');
    });
  });

  describe('fetchDrafts', () => {
    it('should fetch all drafts successfully', async () => {
      const mockDrafts = { success: true, drafts: [{ id: '1' }, { id: '2' }] };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockDrafts));

      const result = await fetchDrafts();

      expect(fetch).toHaveBeenCalledWith('/api/drafts');
      expect(result).toEqual(mockDrafts);
    });
  });

  describe('fetchDraft', () => {
    it('should fetch single draft successfully', async () => {
      const mockDraft = { success: true, draft: { id: '123', summary: 'Test' } };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockDraft));

      const result = await fetchDraft('123');

      expect(fetch).toHaveBeenCalledWith('/api/drafts/123');
      expect(result).toEqual(mockDraft);
    });

    it('should throw error when draft not found', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(404, 'Draft not found'));

      await expect(fetchDraft('999')).rejects.toThrow('Draft not found');
    });
  });

  describe('createDraft', () => {
    it('should create draft successfully', async () => {
      const draft = { summary: 'Test', description: 'Test desc' };
      const mockResponse = { success: true, id: 'new-id', draft };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await createDraft(draft);

      expect(fetch).toHaveBeenCalledWith('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateDraft', () => {
    it('should update draft successfully', async () => {
      const draft = { summary: 'Updated', description: 'Updated desc' };
      const mockResponse = { success: true, draft };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await updateDraft('123', draft);

      expect(fetch).toHaveBeenCalledWith('/api/drafts/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteDraft', () => {
    it('should delete draft successfully', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await deleteDraft('123');

      expect(fetch).toHaveBeenCalledWith('/api/drafts/123', {
        method: 'DELETE',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateDraftStatus', () => {
    it('should update draft status successfully', async () => {
      const mockResponse = { success: true, draft: { id: '123', status: 'imported' } };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await updateDraftStatus('123', 'imported');

      expect(fetch).toHaveBeenCalledWith('/api/drafts/123/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'imported' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('importDraft', () => {
    it('should import draft successfully', async () => {
      const mockResponse = { success: true, jobId: 'job-123' };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await importDraft('123');

      expect(fetch).toHaveBeenCalledWith('/api/drafts/123/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkImportDrafts', () => {
    it('should bulk import drafts successfully', async () => {
      const ids = ['1', '2', '3'];
      const mockResponse = { success: true, jobId: 'bulk-job-123', importedCount: 3 };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await bulkImportDrafts(ids);

      expect(fetch).toHaveBeenCalledWith('/api/drafts/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('migrateDrafts', () => {
    it('should migrate drafts successfully', async () => {
      const testCases = [{ id: '1', summary: 'Test' }];
      const mockResponse = { success: true, migrated: 1, ids: ['new-1'] };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await migrateDrafts(testCases);

      expect(fetch).toHaveBeenCalledWith('/api/drafts/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCases }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchFunctionalAreas', () => {
    it('should fetch functional areas successfully', async () => {
      const mockResponse = { success: true, areas: ['Area1', 'Area2'] };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchFunctionalAreas();

      expect(fetch).toHaveBeenCalledWith('/api/settings/functional-areas');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveFunctionalAreas', () => {
    it('should save functional areas successfully', async () => {
      const areas = ['Area1', 'Area2', 'Area3'];
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await saveFunctionalAreas(areas);

      expect(fetch).toHaveBeenCalledWith('/api/settings/functional-areas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areas }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchLabels', () => {
    it('should fetch labels successfully', async () => {
      const mockResponse = { success: true, labels: ['Label1', 'Label2'] };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchLabels();

      expect(fetch).toHaveBeenCalledWith('/api/settings/labels');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveLabels', () => {
    it('should save labels successfully', async () => {
      const labels = ['Label1', 'Label2', 'Label3'];
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await saveLabels(labels);

      expect(fetch).toHaveBeenCalledWith('/api/settings/labels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchCollections', () => {
    it('should fetch collections successfully', async () => {
      const mockResponse = { success: true, collections: [{ id: '1', name: 'Smoke' }] };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchCollections();

      expect(fetch).toHaveBeenCalledWith('/api/settings/collections');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createCollection', () => {
    it('should create collection successfully', async () => {
      const mockResponse = { success: true, id: 'new-id' };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await createCollection('Smoke', '#ff0000');

      expect(fetch).toHaveBeenCalledWith('/api/settings/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Smoke', color: '#ff0000' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteCollection', () => {
    it('should delete collection successfully', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await deleteCollection('123');

      expect(fetch).toHaveBeenCalledWith('/api/settings/collections/123', {
        method: 'DELETE',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockResponse = { success: true, projects: [{ key: 'WCP', color: '#3b82f6' }] };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchProjects();

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addProject', () => {
    it('should add project successfully', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await addProject('NEW', '#22c55e');

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey: 'NEW', color: '#22c55e' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('hideProject', () => {
    it('should hide project successfully', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await hideProject('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects/WCP/hide', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('unhideProject', () => {
    it('should unhide project successfully', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await unhideProject('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects/WCP/unhide', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('setActiveProject', () => {
    it('should set active project successfully', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await setActiveProject('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects/WCP/activate', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchProjectSettings', () => {
    it('should fetch project settings successfully', async () => {
      const mockResponse = { success: true, settings: { testType: 'Manual' } };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchProjectSettings('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects/WCP');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveProjectSettings', () => {
    it('should save project settings successfully', async () => {
      const settings = { testType: 'Automated' };
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await saveProjectSettings('WCP', settings);

      expect(fetch).toHaveBeenCalledWith('/api/settings/projects/WCP', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchTestPlans', () => {
    it('should fetch test plans for a project', async () => {
      const mockResponse = {
        success: true,
        testPlans: [{ issueId: '1', key: 'WCP-100', summary: 'Plan 1' }],
      };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchTestPlans('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/xray/test-plans/WCP');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed response', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(500, 'Failed to fetch test plans'));

      await expect(fetchTestPlans('WCP')).rejects.toThrow('Failed to fetch test plans');
    });
  });

  describe('fetchTestExecutions', () => {
    it('should fetch test executions for a project', async () => {
      const mockResponse = {
        success: true,
        testExecutions: [{ issueId: '2', key: 'WCP-200', summary: 'Execution 1' }],
      };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchTestExecutions('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/xray/test-executions/WCP');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchTestSets', () => {
    it('should fetch test sets for a project', async () => {
      const mockResponse = {
        success: true,
        testSets: [{ issueId: '3', key: 'WCP-300', summary: 'Set 1' }],
      };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchTestSets('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/xray/test-sets/WCP');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchPreconditions', () => {
    it('should fetch preconditions for a project', async () => {
      const mockResponse = {
        success: true,
        preconditions: [{ issueId: '4', key: 'WCP-400', summary: 'Precondition 1' }],
      };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchPreconditions('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/xray/preconditions/WCP');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchFolders', () => {
    it('should fetch folders for a project with default path', async () => {
      const mockResponse = {
        success: true,
        folders: { path: '/', folders: ['/Smoke', '/Regression'] },
      };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchFolders('WCP');

      expect(fetch).toHaveBeenCalledWith('/api/xray/folders/WCP?path=%2F');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch folders with custom path', async () => {
      const mockResponse = {
        success: true,
        folders: { path: '/Smoke', folders: [] },
      };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await fetchFolders('WCP', '/Smoke');

      expect(fetch).toHaveBeenCalledWith('/api/xray/folders/WCP?path=%2FSmoke');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('linkTestToEntities', () => {
    it('should link test to entities successfully', async () => {
      const linkData = {
        testIssueId: 'test-1',
        projectKey: 'WCP',
        testPlanIds: ['plan-1'],
        testExecutionIds: [],
        testSetIds: [],
        folderPath: '/',
        preconditionIds: [],
      };
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await linkTestToEntities(linkData);

      expect(fetch).toHaveBeenCalledWith('/api/xray/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed link', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(400, 'Invalid test issue ID'));

      await expect(linkTestToEntities({})).rejects.toThrow('Invalid test issue ID');
    });
  });

  describe('updateTestLinks', () => {
    it('should update test links successfully', async () => {
      const data = {
        testIssueId: 'test-1',
        projectKey: 'WCP',
        testPlanIds: ['plan-1', 'plan-2'],
        originalTestPlanIds: ['plan-1'],
        testExecutionIds: [],
        originalTestExecutionIds: ['exec-1'],
      };
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await updateTestLinks(data);

      expect(fetch).toHaveBeenCalledWith('/api/xray/update-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed update', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(500, 'Failed to update links'));

      await expect(updateTestLinks({})).rejects.toThrow('Failed to update links');
    });
  });

  describe('updateDraftXrayLinks', () => {
    it('should update draft xray links successfully', async () => {
      const xrayLinking = {
        testPlanIds: ['plan-1'],
        testExecutionIds: [],
        testSetIds: [],
        folderPath: '/Smoke',
        preconditionIds: [],
      };
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));

      const result = await updateDraftXrayLinks('draft-123', xrayLinking);

      expect(fetch).toHaveBeenCalledWith('/api/drafts/draft-123/xray-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xrayLinking }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when draft not found', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponse(404, 'Draft not found'));

      await expect(updateDraftXrayLinks('invalid-id', {})).rejects.toThrow('Draft not found');
    });
  });
});
