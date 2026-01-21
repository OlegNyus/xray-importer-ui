import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  importToXray,
  validateCredentials,
  getJobStatus,
  importToXrayAndWait,
  getTestPlans,
  getTestExecutions,
  getTestSets,
  getPreconditions,
  getFolders,
  getProjectId,
  addTestsToTestPlan,
  addTestsToTestExecution,
  addTestsToTestSet,
  addTestsToFolder,
  addPreconditionsToTest,
  removeTestsFromTestPlan,
  removeTestsFromTestExecution,
  removeTestsFromTestSet,
  removeTestsFromFolder,
  removePreconditionsFromTest,
} from '../utils/xrayClient.js';
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

  describe('validateCredentials', () => {
    it('should return success when credentials are valid', async () => {
      axios.post.mockResolvedValueOnce({ data: 'valid-token' });

      const result = await validateCredentials({
        xrayClientId: 'valid-id',
        xrayClientSecret: 'valid-secret',
      });

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://xray.cloud.getxray.app/api/v2/authenticate',
        {
          client_id: 'valid-id',
          client_secret: 'valid-secret',
        },
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        })
      );
    });

    it('should return error for invalid credentials', async () => {
      const authError = new Error('Invalid client credentials');
      authError.response = {
        data: { error: 'Invalid client credentials' },
      };
      axios.post.mockRejectedValueOnce(authError);

      const result = await validateCredentials({
        xrayClientId: 'invalid-id',
        xrayClientSecret: 'invalid-secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Client ID or Client Secret');
    });

    it('should return error for network failure', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await validateCredentials({
        xrayClientId: 'test-id',
        xrayClientSecret: 'test-secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed: Network timeout');
    });

    it('should return error when no token received', async () => {
      axios.post.mockResolvedValueOnce({ data: null });

      const result = await validateCredentials({
        xrayClientId: 'test-id',
        xrayClientSecret: 'test-secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed: No token received');
    });
  });

  describe('getJobStatus', () => {
    it('should return error when config not found', async () => {
      fileOps.readConfig.mockReturnValue(null);

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
    });

    it('should return success when job is successful', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'successful',
          result: {
            issues: [
              { id: 'issue-1', key: 'WCP-100' },
              { id: 'issue-2', key: 'WCP-101' },
            ],
          },
        },
      });

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('successful');
      expect(result.testIssueIds).toEqual(['issue-1', 'issue-2']);
      expect(result.testKeys).toEqual(['WCP-100', 'WCP-101']);
    });

    it('should handle createdIssues format', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'successful',
          result: {
            createdIssues: [{ id: 'issue-1', key: 'WCP-100' }],
          },
        },
      });

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(true);
      expect(result.testIssueIds).toEqual(['issue-1']);
    });

    it('should return failure when job fails', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'failed',
          result: { error: 'Import validation failed' },
        },
      });

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Import validation failed');
    });

    it('should handle failed job with message', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'failed',
          result: { message: 'Custom error message' },
        },
      });

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });

    it('should handle failed job with errors array', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'failed',
          result: { errors: ['Error 1', 'Error 2'] },
        },
      });

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error 1, Error 2');
    });

    it('should poll until completion', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get
        .mockResolvedValueOnce({ data: { status: 'working' } })
        .mockResolvedValueOnce({ data: { status: 'pending' } })
        .mockResolvedValueOnce({
          data: {
            status: 'successful',
            result: { issues: [{ id: 'id-1', key: 'KEY-1' }] },
          },
        });

      const result = await getJobStatus('job-123', 5, 10);

      expect(result.success).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(3);
    });

    it('should timeout after max attempts', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValue({ data: { status: 'working' } });

      const result = await getJobStatus('job-123', 2, 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job status polling timed out');
    });

    it('should handle network error during polling', async () => {
      axios.post.mockResolvedValueOnce({ data: 'token' });
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await getJobStatus('job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get job status: Network error');
    });
  });

  describe('importToXrayAndWait', () => {
    it('should return error when import fails', async () => {
      fileOps.readConfig.mockReturnValue(null);

      const result = await importToXrayAndWait([{ summary: 'Test' }]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
    });

    it('should return success with test issue IDs', async () => {
      // Uses cached token from config
      const configWithToken = {
        ...createMockConfig(),
        tokenData: {
          token: 'cached-token',
          timestamp: Date.now(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
      fileOps.readConfig.mockImplementation(() => configWithToken);

      axios.post.mockResolvedValueOnce({ data: { jobId: 'job-123' } });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'successful',
          result: { issues: [{ id: 'id-1', key: 'KEY-1' }] },
        },
      });

      const result = await importToXrayAndWait([{ summary: 'Test' }]);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(result.testIssueIds).toEqual(['id-1']);
      expect(result.testKeys).toEqual(['KEY-1']);
    });

    it('should return error when job fails', async () => {
      axios.post
        .mockResolvedValueOnce({ data: 'token' })
        .mockResolvedValueOnce({ data: { jobId: 'job-123' } })
        .mockResolvedValueOnce({ data: 'token' });
      axios.get.mockResolvedValueOnce({
        data: { status: 'failed', result: { error: 'Job failed' } },
      });

      const result = await importToXrayAndWait([{ summary: 'Test' }]);

      expect(result.success).toBe(false);
      expect(result.jobId).toBe('job-123');
      expect(result.error).toBe('Job failed');
    });
  });

  describe('GraphQL Query Functions', () => {
    const mockConfigWithToken = {
      xrayClientId: 'test-id',
      xrayClientSecret: 'test-secret',
      jiraBaseUrl: 'https://test.atlassian.net',
      projectKey: 'TEST',
      tokenData: {
        token: 'valid-token',
        timestamp: Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    beforeEach(() => {
      fileOps.readConfig.mockReturnValue(mockConfigWithToken);
    });

    describe('getTestPlans', () => {
      it('should fetch test plans for a project', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getTestPlans: {
                total: 2,
                results: [
                  { issueId: '1', jira: { key: 'WCP-100', summary: 'Plan 1' } },
                  { issueId: '2', jira: { key: 'WCP-101', summary: 'Plan 2' } },
                ],
              },
            },
          },
        });

        const result = await getTestPlans('WCP');

        expect(result).toEqual([
          { issueId: '1', key: 'WCP-100', summary: 'Plan 1' },
          { issueId: '2', key: 'WCP-101', summary: 'Plan 2' },
        ]);
        expect(axios.post).toHaveBeenCalledWith(
          'https://xray.cloud.getxray.app/api/v2/graphql',
          expect.objectContaining({
            variables: { jql: "project = 'WCP'", limit: 100 },
          }),
          expect.any(Object)
        );
      });

      it('should throw error on GraphQL error', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            errors: [{ message: 'GraphQL error occurred' }],
          },
        });

        await expect(getTestPlans('WCP')).rejects.toThrow('GraphQL error occurred');
      });

      it('should throw error when config not found', async () => {
        fileOps.readConfig.mockReturnValue(null);

        await expect(getTestPlans('WCP')).rejects.toThrow('Config not found');
      });
    });

    describe('getTestExecutions', () => {
      it('should fetch test executions for a project', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getTestExecutions: {
                total: 1,
                results: [
                  { issueId: '3', jira: { key: 'WCP-200', summary: 'Execution 1' } },
                ],
              },
            },
          },
        });

        const result = await getTestExecutions('WCP');

        expect(result).toEqual([
          { issueId: '3', key: 'WCP-200', summary: 'Execution 1' },
        ]);
      });
    });

    describe('getTestSets', () => {
      it('should fetch test sets for a project', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getTestSets: {
                total: 1,
                results: [
                  { issueId: '4', jira: { key: 'WCP-300', summary: 'Set 1' } },
                ],
              },
            },
          },
        });

        const result = await getTestSets('WCP');

        expect(result).toEqual([
          { issueId: '4', key: 'WCP-300', summary: 'Set 1' },
        ]);
      });
    });

    describe('getPreconditions', () => {
      it('should fetch preconditions for a project', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getPreconditions: {
                total: 1,
                results: [
                  { issueId: '5', jira: { key: 'WCP-400', summary: 'Precondition 1' } },
                ],
              },
            },
          },
        });

        const result = await getPreconditions('WCP');

        expect(result).toEqual([
          { issueId: '5', key: 'WCP-400', summary: 'Precondition 1' },
        ]);
      });
    });

    describe('getFolders', () => {
      it('should fetch folders for a project', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getFolder: {
                name: 'Root',
                path: '/',
                testsCount: 10,
                folders: ['/Smoke Tests', '/Regression'],
              },
            },
          },
        });

        const result = await getFolders('proj-123', '/');

        expect(result).toEqual({
          name: 'Root',
          path: '/',
          testsCount: 10,
          folders: ['/Smoke Tests', '/Regression'],
        });
      });

      it('should use default path when not provided', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getFolder: { name: 'Root', path: '/', testsCount: 0, folders: [] },
            },
          },
        });

        await getFolders('proj-123');

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            variables: { projectId: 'proj-123', path: '/' },
          }),
          expect.any(Object)
        );
      });
    });

    describe('getProjectId', () => {
      it('should return project ID', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getProjectSettings: { projectId: 'proj-456' },
            },
          },
        });

        const result = await getProjectId('WCP');

        expect(result).toBe('proj-456');
      });

      it('should throw error when project not found', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              getProjectSettings: null,
            },
          },
        });

        await expect(getProjectId('UNKNOWN')).rejects.toThrow(
          'Could not resolve project ID for UNKNOWN'
        );
      });
    });
  });

  describe('GraphQL Add Mutations', () => {
    const mockConfigWithToken = {
      xrayClientId: 'test-id',
      xrayClientSecret: 'test-secret',
      jiraBaseUrl: 'https://test.atlassian.net',
      projectKey: 'TEST',
      tokenData: {
        token: 'valid-token',
        timestamp: Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    beforeEach(() => {
      fileOps.readConfig.mockReturnValue(mockConfigWithToken);
    });

    describe('addTestsToTestPlan', () => {
      it('should add tests to test plan', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              addTestsToTestPlan: { addedTests: ['test-1', 'test-2'], warning: null },
            },
          },
        });

        const result = await addTestsToTestPlan('plan-1', ['test-1', 'test-2']);

        expect(result).toEqual({ addedTests: ['test-1', 'test-2'], warning: null });
        expect(axios.post).toHaveBeenCalledWith(
          'https://xray.cloud.getxray.app/api/v2/graphql',
          expect.objectContaining({
            variables: { issueId: 'plan-1', testIssueIds: ['test-1', 'test-2'] },
          }),
          expect.any(Object)
        );
      });

      it('should return warning when present', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              addTestsToTestPlan: { addedTests: [], warning: 'Tests already in plan' },
            },
          },
        });

        const result = await addTestsToTestPlan('plan-1', ['test-1']);

        expect(result.warning).toBe('Tests already in plan');
      });
    });

    describe('addTestsToTestExecution', () => {
      it('should add tests to test execution', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              addTestsToTestExecution: { addedTests: ['test-1'], warning: null },
            },
          },
        });

        const result = await addTestsToTestExecution('exec-1', ['test-1']);

        expect(result).toEqual({ addedTests: ['test-1'], warning: null });
      });
    });

    describe('addTestsToTestSet', () => {
      it('should add tests to test set', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              addTestsToTestSet: { addedTests: ['test-1'], warning: null },
            },
          },
        });

        const result = await addTestsToTestSet('set-1', ['test-1']);

        expect(result).toEqual({ addedTests: ['test-1'], warning: null });
      });
    });

    describe('addTestsToFolder', () => {
      it('should add tests to folder', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              addTestsToFolder: {
                folder: { name: 'Smoke', path: '/Smoke', testsCount: 5 },
                warnings: null,
              },
            },
          },
        });

        const result = await addTestsToFolder('proj-1', '/Smoke', ['test-1']);

        expect(result).toEqual({
          folder: { name: 'Smoke', path: '/Smoke', testsCount: 5 },
          warnings: null,
        });
      });
    });

    describe('addPreconditionsToTest', () => {
      it('should add preconditions to test', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              addPreconditionsToTest: { addedPreconditions: ['pre-1'], warning: null },
            },
          },
        });

        const result = await addPreconditionsToTest('test-1', ['pre-1']);

        expect(result).toEqual({ addedPreconditions: ['pre-1'], warning: null });
      });
    });
  });

  describe('GraphQL Remove Mutations', () => {
    const mockConfigWithToken = {
      xrayClientId: 'test-id',
      xrayClientSecret: 'test-secret',
      jiraBaseUrl: 'https://test.atlassian.net',
      projectKey: 'TEST',
      tokenData: {
        token: 'valid-token',
        timestamp: Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    beforeEach(() => {
      fileOps.readConfig.mockReturnValue(mockConfigWithToken);
    });

    describe('removeTestsFromTestPlan', () => {
      it('should remove tests from test plan', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              removeTestsFromTestPlan: { removedTests: ['test-1'], warning: null },
            },
          },
        });

        const result = await removeTestsFromTestPlan('plan-1', ['test-1']);

        expect(result).toEqual({ removedTests: ['test-1'], warning: null });
        expect(axios.post).toHaveBeenCalledWith(
          'https://xray.cloud.getxray.app/api/v2/graphql',
          expect.objectContaining({
            variables: { issueId: 'plan-1', testIssueIds: ['test-1'] },
          }),
          expect.any(Object)
        );
      });

      it('should return warning when present', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              removeTestsFromTestPlan: { removedTests: [], warning: 'Test not in plan' },
            },
          },
        });

        const result = await removeTestsFromTestPlan('plan-1', ['test-1']);

        expect(result.warning).toBe('Test not in plan');
      });
    });

    describe('removeTestsFromTestExecution', () => {
      it('should remove tests from test execution', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              removeTestsFromTestExecution: { removedTests: ['test-1'], warning: null },
            },
          },
        });

        const result = await removeTestsFromTestExecution('exec-1', ['test-1']);

        expect(result).toEqual({ removedTests: ['test-1'], warning: null });
      });
    });

    describe('removeTestsFromTestSet', () => {
      it('should remove tests from test set', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              removeTestsFromTestSet: { removedTests: ['test-1'], warning: null },
            },
          },
        });

        const result = await removeTestsFromTestSet('set-1', ['test-1']);

        expect(result).toEqual({ removedTests: ['test-1'], warning: null });
      });
    });

    describe('removeTestsFromFolder', () => {
      it('should remove tests from folder', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              removeTestsFromFolder: {
                folder: { name: 'Smoke', path: '/Smoke', testsCount: 3 },
                warnings: null,
              },
            },
          },
        });

        const result = await removeTestsFromFolder('proj-1', '/Smoke', ['test-1']);

        expect(result).toEqual({
          folder: { name: 'Smoke', path: '/Smoke', testsCount: 3 },
          warnings: null,
        });
      });
    });

    describe('removePreconditionsFromTest', () => {
      it('should remove preconditions from test', async () => {
        axios.post.mockResolvedValueOnce({
          data: {
            data: {
              removePreconditionsFromTest: { removedPreconditions: ['pre-1'], warning: null },
            },
          },
        });

        const result = await removePreconditionsFromTest('test-1', ['pre-1']);

        expect(result).toEqual({ removedPreconditions: ['pre-1'], warning: null });
      });
    });
  });
});
