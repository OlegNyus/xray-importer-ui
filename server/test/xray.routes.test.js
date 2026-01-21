import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import xrayRoutes from '../routes/xray.js';
import * as xrayClient from '../utils/xrayClient.js';

vi.mock('../utils/xrayClient.js');

describe('Xray Routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/xray', xrayRoutes);
  });

  describe('GET /xray/test-plans/:projectKey', () => {
    it('should return test plans for a project', async () => {
      const mockTestPlans = [
        { issueId: '1', key: 'WCP-100', summary: 'Test Plan 1' },
        { issueId: '2', key: 'WCP-101', summary: 'Test Plan 2' },
      ];
      xrayClient.getTestPlans.mockResolvedValue(mockTestPlans);

      const response = await request(app).get('/xray/test-plans/WCP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.testPlans).toEqual(mockTestPlans);
      expect(xrayClient.getTestPlans).toHaveBeenCalledWith('WCP');
    });

    it('should return 500 on error', async () => {
      xrayClient.getTestPlans.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/xray/test-plans/WCP');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API Error');
    });

    it('should return default error message when error has no message', async () => {
      xrayClient.getTestPlans.mockRejectedValue({});

      const response = await request(app).get('/xray/test-plans/WCP');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch test plans');
    });
  });

  describe('GET /xray/test-executions/:projectKey', () => {
    it('should return test executions for a project', async () => {
      const mockTestExecutions = [
        { issueId: '3', key: 'WCP-200', summary: 'Test Execution 1' },
      ];
      xrayClient.getTestExecutions.mockResolvedValue(mockTestExecutions);

      const response = await request(app).get('/xray/test-executions/WCP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.testExecutions).toEqual(mockTestExecutions);
    });

    it('should return 500 on error', async () => {
      xrayClient.getTestExecutions.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/xray/test-executions/WCP');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('API Error');
    });
  });

  describe('GET /xray/test-sets/:projectKey', () => {
    it('should return test sets for a project', async () => {
      const mockTestSets = [{ issueId: '4', key: 'WCP-300', summary: 'Test Set 1' }];
      xrayClient.getTestSets.mockResolvedValue(mockTestSets);

      const response = await request(app).get('/xray/test-sets/WCP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.testSets).toEqual(mockTestSets);
    });

    it('should return 500 on error', async () => {
      xrayClient.getTestSets.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/xray/test-sets/WCP');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('API Error');
    });
  });

  describe('GET /xray/preconditions/:projectKey', () => {
    it('should return preconditions for a project', async () => {
      const mockPreconditions = [{ issueId: '5', key: 'WCP-400', summary: 'Precondition 1' }];
      xrayClient.getPreconditions.mockResolvedValue(mockPreconditions);

      const response = await request(app).get('/xray/preconditions/WCP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preconditions).toEqual(mockPreconditions);
    });

    it('should return 500 on error', async () => {
      xrayClient.getPreconditions.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/xray/preconditions/WCP');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('API Error');
    });
  });

  describe('GET /xray/folders/:projectKey', () => {
    it('should return folders for a project', async () => {
      xrayClient.getProjectId.mockResolvedValue('proj-1');
      xrayClient.getFolders.mockResolvedValue({ path: '/', folders: [] });

      const response = await request(app).get('/xray/folders/WCP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folders).toEqual({ path: '/', folders: [] });
      expect(response.body.projectId).toBe('proj-1');
    });

    it('should use path query parameter', async () => {
      xrayClient.getProjectId.mockResolvedValue('proj-1');
      xrayClient.getFolders.mockResolvedValue({ path: '/Tests', folders: [] });

      const response = await request(app).get('/xray/folders/WCP?path=/Tests');

      expect(xrayClient.getFolders).toHaveBeenCalledWith('proj-1', '/Tests');
    });

    it('should return 500 on error', async () => {
      xrayClient.getProjectId.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/xray/folders/WCP');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('API Error');
    });
  });

  describe('POST /xray/link', () => {
    it('should return 400 if testIssueId is missing', async () => {
      const response = await request(app)
        .post('/xray/link')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Test issue ID is required');
    });

    it('should link test to test plans', async () => {
      xrayClient.addTestsToTestPlan.mockResolvedValue({ addedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          testPlanIds: ['plan-1', 'plan-2'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results.testPlans).toHaveLength(2);
      expect(xrayClient.addTestsToTestPlan).toHaveBeenCalledTimes(2);
    });

    it('should link test to test executions', async () => {
      xrayClient.addTestsToTestExecution.mockResolvedValue({ addedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          testExecutionIds: ['exec-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testExecutions).toHaveLength(1);
    });

    it('should link test to test sets', async () => {
      xrayClient.addTestsToTestSet.mockResolvedValue({ addedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          testSetIds: ['set-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testSets).toHaveLength(1);
    });

    it('should link test to folder', async () => {
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/Tests' } });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          projectId: 'proj-1',
          folderPath: '/Tests',
        });

      expect(response.status).toBe(200);
      expect(response.body.results.folder).toBeDefined();
    });

    it('should resolve projectId from projectKey for folder linking', async () => {
      xrayClient.getProjectId.mockResolvedValue('proj-1');
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/Tests' } });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          projectKey: 'WCP',
          folderPath: '/Tests',
        });

      expect(response.status).toBe(200);
      expect(xrayClient.getProjectId).toHaveBeenCalledWith('WCP');
    });

    it('should add warning if projectId cannot be resolved', async () => {
      xrayClient.getProjectId.mockRejectedValue(new Error('Failed'));

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          projectKey: 'WCP',
          folderPath: '/Tests',
        });

      expect(response.status).toBe(200);
      expect(response.body.warnings).toContain('Folder linking skipped: Jira API credentials required for folder placement');
    });

    it('should link preconditions to test', async () => {
      xrayClient.addPreconditionsToTest.mockResolvedValue({ addedPreconditions: ['prec-1'] });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          preconditionIds: ['prec-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.results.preconditions).toBeDefined();
    });

    it('should handle test plan linking error', async () => {
      xrayClient.addTestsToTestPlan.mockRejectedValue(new Error('Link failed'));

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          testPlanIds: ['plan-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testPlans[0].success).toBe(false);
      expect(response.body.warnings).toContain('Test Plan plan-1 linking failed: Link failed');
    });

    it('should include warnings from successful operations', async () => {
      xrayClient.addTestsToTestPlan.mockResolvedValue({ addedTests: [], warning: 'Test already in plan' });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          testPlanIds: ['plan-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.warnings).toContain('Test Plan plan-1: Test already in plan');
    });

    it('should handle folder warnings', async () => {
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/Tests' }, warnings: ['Already in folder'] });

      const response = await request(app)
        .post('/xray/link')
        .send({
          testIssueId: 'test-1',
          projectId: 'proj-1',
          folderPath: '/Tests',
        });

      expect(response.body.warnings).toContain('Folder: Already in folder');
    });
  });

  describe('POST /xray/update-links', () => {
    it('should return 400 if testIssueId is missing', async () => {
      const response = await request(app)
        .post('/xray/update-links')
        .send({ diff: {} });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Test issue ID is required');
    });

    it('should return 400 if diff is missing', async () => {
      const response = await request(app)
        .post('/xray/update-links')
        .send({ testIssueId: 'test-1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Diff object is required');
    });

    it('should add test plans', async () => {
      xrayClient.addTestsToTestPlan.mockResolvedValue({ addedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testPlans: { toAdd: ['plan-1'], toRemove: [] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testPlans.added).toHaveLength(1);
    });

    it('should remove test plans', async () => {
      xrayClient.removeTestsFromTestPlan.mockResolvedValue({ removedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testPlans: { toAdd: [], toRemove: ['plan-1'] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testPlans.removed).toHaveLength(1);
    });

    it('should add test executions', async () => {
      xrayClient.addTestsToTestExecution.mockResolvedValue({ addedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testExecutions: { toAdd: ['exec-1'], toRemove: [] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testExecutions.added).toHaveLength(1);
    });

    it('should remove test executions', async () => {
      xrayClient.removeTestsFromTestExecution.mockResolvedValue({ removedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testExecutions: { toAdd: [], toRemove: ['exec-1'] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testExecutions.removed).toHaveLength(1);
    });

    it('should add test sets', async () => {
      xrayClient.addTestsToTestSet.mockResolvedValue({ addedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testSets: { toAdd: ['set-1'], toRemove: [] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testSets.added).toHaveLength(1);
    });

    it('should remove test sets', async () => {
      xrayClient.removeTestsFromTestSet.mockResolvedValue({ removedTests: ['test-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testSets: { toAdd: [], toRemove: ['set-1'] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.testSets.removed).toHaveLength(1);
    });

    it('should move test to new folder', async () => {
      xrayClient.removeTestsFromFolder.mockResolvedValue({});
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/NewFolder' } });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          projectId: 'proj-1',
          diff: {
            folder: { original: '/OldFolder', current: '/NewFolder' },
          },
        });

      expect(response.status).toBe(200);
      expect(xrayClient.removeTestsFromFolder).toHaveBeenCalledWith('proj-1', '/OldFolder', ['test-1']);
      expect(xrayClient.addTestsToFolder).toHaveBeenCalledWith('proj-1', '/NewFolder', ['test-1']);
    });

    it('should not remove from root folder', async () => {
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/NewFolder' } });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          projectId: 'proj-1',
          diff: {
            folder: { original: '/', current: '/NewFolder' },
          },
        });

      expect(response.status).toBe(200);
      expect(xrayClient.removeTestsFromFolder).not.toHaveBeenCalled();
      expect(xrayClient.addTestsToFolder).toHaveBeenCalled();
    });

    it('should not add to root folder', async () => {
      xrayClient.removeTestsFromFolder.mockResolvedValue({});

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          projectId: 'proj-1',
          diff: {
            folder: { original: '/OldFolder', current: '/' },
          },
        });

      expect(response.status).toBe(200);
      expect(xrayClient.removeTestsFromFolder).toHaveBeenCalled();
      expect(xrayClient.addTestsToFolder).not.toHaveBeenCalled();
    });

    it('should add preconditions', async () => {
      xrayClient.addPreconditionsToTest.mockResolvedValue({ addedPreconditions: ['prec-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            preconditions: { toAdd: ['prec-1'], toRemove: [] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.preconditions.added).toBeDefined();
    });

    it('should remove preconditions', async () => {
      xrayClient.removePreconditionsFromTest.mockResolvedValue({ removedPreconditions: ['prec-1'] });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            preconditions: { toAdd: [], toRemove: ['prec-1'] },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.results.preconditions.removed).toBeDefined();
    });

    it('should resolve projectId from projectKey', async () => {
      xrayClient.getProjectId.mockResolvedValue('proj-1');
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/Tests' } });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          projectKey: 'WCP',
          diff: {
            folder: { original: '/', current: '/Tests' },
          },
        });

      expect(response.status).toBe(200);
      expect(xrayClient.getProjectId).toHaveBeenCalledWith('WCP');
    });

    it('should handle folder remove error gracefully', async () => {
      xrayClient.removeTestsFromFolder.mockRejectedValue(new Error('Remove failed'));
      xrayClient.addTestsToFolder.mockResolvedValue({ folder: { path: '/New' } });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          projectId: 'proj-1',
          diff: {
            folder: { original: '/Old', current: '/New' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.warnings).toContain('Folder remove from /Old failed: Remove failed');
    });

    it('should return 500 on unexpected error', async () => {
      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: null, // This triggers the validation error, not this test
        });

      expect(response.status).toBe(400);
    });

    it('should handle test plan add error with warning', async () => {
      xrayClient.addTestsToTestPlan.mockRejectedValue(new Error('Add failed'));

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testPlans: { toAdd: ['plan-1'], toRemove: [] },
          },
        });

      expect(response.body.results.testPlans.added[0].success).toBe(false);
      expect(response.body.warnings).toContain('Test Plan plan-1 add failed: Add failed');
    });

    it('should handle test plan remove error with warning', async () => {
      xrayClient.removeTestsFromTestPlan.mockRejectedValue(new Error('Remove failed'));

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testPlans: { toAdd: [], toRemove: ['plan-1'] },
          },
        });

      expect(response.body.warnings).toContain('Test Plan plan-1 remove failed: Remove failed');
    });

    it('should include warnings from operations', async () => {
      xrayClient.addTestsToTestPlan.mockResolvedValue({ addedTests: [], warning: 'Already linked' });

      const response = await request(app)
        .post('/xray/update-links')
        .send({
          testIssueId: 'test-1',
          diff: {
            testPlans: { toAdd: ['plan-1'], toRemove: [] },
          },
        });

      expect(response.body.warnings).toContain('Test Plan plan-1 add: Already linked');
    });
  });
});
