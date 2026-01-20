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
      const mockConfig = { exists: true, config: { projectKey: 'WCP' } };
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
});
