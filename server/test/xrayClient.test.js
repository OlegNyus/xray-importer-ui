import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { importToXray } from '../utils/xrayClient.js';
import * as fileOps from '../utils/fileOperations.js';

vi.mock('axios');
vi.mock('../utils/fileOperations.js');

describe('xrayClient', () => {
  // Function to return fresh config each time
  const createMockConfig = () => ({
    xrayClientId: 'test-client-id',
    xrayClientSecret: 'test-client-secret',
    jiraBaseUrl: 'https://test.atlassian.net',
    projectKey: 'TEST',
  });

  const mockTestCases = [
    {
      summary: 'Test Case 1',
      description: 'Description 1',
      testType: 'Manual',
      labels: ['label1', 'label2'],
      steps: [
        { action: 'Action 1', data: 'Data 1', result: 'Result 1' },
        { action: 'Action 2', data: '', result: 'Result 2' },
      ],
    },
    {
      summary: 'Test Case 2',
      description: '',
      labels: [],
      steps: [],
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    // Return a fresh config object for each call
    fileOps.readConfig.mockImplementation(() => createMockConfig());
    fileOps.writeConfig.mockReturnValue('/path/to/config');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('importToXray', () => {
    it('should return error when config not found', async () => {
      fileOps.readConfig.mockReturnValue(null);

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
    });

    it('should get fresh token and import successfully', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'fresh-token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-123' } });

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(result.message).toBe('Import job created successfully!');

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        'https://xray.cloud.getxray.app/api/v2/authenticate',
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
        },
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        })
      );

      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'https://xray.cloud.getxray.app/api/v1/import/test/bulk',
        expect.any(Array),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer fresh-token',
            'Content-Type': 'application/json',
          },
        })
      );

      expect(fileOps.writeConfig).toHaveBeenCalled();
    });

    it('should use cached token if valid', async () => {
      const configWithToken = {
        ...createMockConfig(),
        tokenData: {
          token: 'cached-token',
          timestamp: Date.now(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
      fileOps.readConfig.mockImplementation(() => configWithToken);

      axios.post.mockResolvedValueOnce({ data: { jobId: 'job-456' } });

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-456');
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://xray.cloud.getxray.app/api/v1/import/test/bulk',
        expect.any(Array),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer cached-token',
          }),
        })
      );
    });

    it('should refresh token if expired', async () => {
      const configWithExpiredToken = {
        ...createMockConfig(),
        tokenData: {
          token: 'old-token',
          timestamp: Date.now() - (24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      };
      fileOps.readConfig.mockImplementation(() => configWithExpiredToken);

      axios.post
        .mockResolvedValueOnce({ data: 'new-token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-789' } });

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should refresh token if token data is incomplete (missing token)', async () => {
      const configWithIncompleteToken = {
        ...createMockConfig(),
        tokenData: {
          token: null,
          timestamp: Date.now(),
        },
      };
      fileOps.readConfig.mockImplementation(() => configWithIncompleteToken);

      axios.post
        .mockResolvedValueOnce({ data: 'new-token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-999' } });

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should refresh token if token data is incomplete (missing timestamp)', async () => {
      const configWithIncompleteToken = {
        ...createMockConfig(),
        tokenData: {
          token: 'some-token',
        },
      };
      fileOps.readConfig.mockImplementation(() => configWithIncompleteToken);

      axios.post
        .mockResolvedValueOnce({ data: 'new-token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-888' } });

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid client credentials error', async () => {
      const authError = new Error('Invalid client credentials');
      authError.response = {
        data: { error: 'Invalid client credentials' },
      };
      axios.post.mockRejectedValueOnce(authError);

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed: Invalid client credentials');
    });

    it('should handle generic auth error with response', async () => {
      const authError = new Error('Some other auth error');
      authError.response = {
        data: { error: 'Some other auth error' },
      };
      axios.post.mockRejectedValueOnce(authError);

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed: Some other auth error');
    });

    it('should handle auth error without response', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed: Network timeout');
    });

    it('should return error when import returns no jobId', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockResolvedValueOnce({ data: {} });

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import completed but no jobId returned');
    });

    it('should handle import error with response', async () => {
      const importError = new Error('Invalid test format');
      importError.response = {
        data: { error: 'Invalid test format' },
      };
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockRejectedValueOnce(importError);

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import failed: Invalid test format');
    });

    it('should handle import error without response', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockRejectedValueOnce(new Error('Connection reset'));

      const result = await importToXray(mockTestCases);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import failed: Connection reset');
    });

    it('should convert test cases to correct format', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-format' } });

      await importToXray(mockTestCases);

      expect(axios.post).toHaveBeenCalledTimes(2);
      const importCall = axios.post.mock.calls[1];
      const payload = importCall[1];

      expect(payload[0]).toEqual({
        testtype: 'Manual',
        fields: {
          summary: 'Test Case 1',
          project: { key: 'TEST' },
          description: 'Description 1',
          labels: ['label1', 'label2'],
        },
        steps: [
          { action: 'Action 1', data: 'Data 1', result: 'Result 1' },
          { action: 'Action 2', data: '', result: 'Result 2' },
        ],
      });

      expect(payload[1]).toEqual({
        testtype: 'Manual',
        fields: {
          summary: 'Test Case 2',
          project: { key: 'TEST' },
          description: '',
          labels: [],
        },
        steps: [],
      });
    });

    it('should handle test case with missing steps', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-no-steps' } });

      const testCaseNoSteps = [{ summary: 'No steps test' }];

      await importToXray(testCaseNoSteps);

      expect(axios.post).toHaveBeenCalledTimes(2);
      const importCall = axios.post.mock.calls[1];
      const payload = importCall[1];

      expect(payload[0].steps).toEqual([]);
    });

    it('should handle test case with undefined step fields', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-undef-fields' } });

      const testCaseUndefinedFields = [{
        summary: 'Test',
        steps: [{ action: undefined, data: undefined, result: undefined }],
      }];

      await importToXray(testCaseUndefinedFields);

      const importCall = axios.post.mock.calls[1];
      const payload = importCall[1];

      expect(payload[0].steps[0]).toEqual({
        action: '',
        data: '',
        result: '',
      });
    });
  });
});
