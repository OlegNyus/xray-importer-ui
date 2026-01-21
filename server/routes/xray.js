import express from 'express';
import {
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

const router = express.Router();

/**
 * @swagger
 * /xray/test-plans/{projectKey}:
 *   get:
 *     summary: Get Test Plans for a project
 *     tags: [Xray]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of test plans
 */
router.get('/test-plans/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const testPlans = await getTestPlans(projectKey);
    res.json({ success: true, testPlans });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch test plans',
    });
  }
});

/**
 * @swagger
 * /xray/test-executions/{projectKey}:
 *   get:
 *     summary: Get Test Executions for a project
 *     tags: [Xray]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of test executions
 */
router.get('/test-executions/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const testExecutions = await getTestExecutions(projectKey);
    res.json({ success: true, testExecutions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch test executions',
    });
  }
});

/**
 * @swagger
 * /xray/test-sets/{projectKey}:
 *   get:
 *     summary: Get Test Sets for a project
 *     tags: [Xray]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of test sets
 */
router.get('/test-sets/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const testSets = await getTestSets(projectKey);
    res.json({ success: true, testSets });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch test sets',
    });
  }
});

/**
 * @swagger
 * /xray/preconditions/{projectKey}:
 *   get:
 *     summary: Get Preconditions for a project
 *     tags: [Xray]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of preconditions
 */
router.get('/preconditions/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const preconditions = await getPreconditions(projectKey);
    res.json({ success: true, preconditions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch preconditions',
    });
  }
});

/**
 * @swagger
 * /xray/folders/{projectKey}:
 *   get:
 *     summary: Get folder structure for a project
 *     tags: [Xray]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: "Folder path (default: root)"
 *     responses:
 *       200:
 *         description: Folder structure
 */
router.get('/folders/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { path = '/' } = req.query;

    // First get the project ID
    const projectId = await getProjectId(projectKey);
    const folders = await getFolders(projectId, path);

    res.json({ success: true, folders, projectId });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch folders',
    });
  }
});

/**
 * @swagger
 * /xray/link:
 *   post:
 *     summary: Link a test to Test Plans, Test Executions, Test Sets, Folder, and Preconditions
 *     tags: [Xray]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testIssueId
 *             properties:
 *               testIssueId:
 *                 type: string
 *               testPlanIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               testExecutionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               testSetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               projectId:
 *                 type: string
 *               folderPath:
 *                 type: string
 *               preconditionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Linking results
 */
router.post('/link', async (req, res) => {
  try {
    const {
      testIssueId,
      testPlanIds,
      testExecutionIds,
      testSetIds,
      projectId,
      projectKey,
      folderPath,
      preconditionIds,
    } = req.body;

    if (!testIssueId) {
      return res.status(400).json({
        success: false,
        error: 'Test issue ID is required',
      });
    }

    const results = {
      testPlans: [],
      testExecutions: [],
      testSets: [],
      folder: null,
      preconditions: null,
    };
    const warnings = [];

    // Try to get projectId if we have projectKey but no projectId
    let resolvedProjectId = projectId;
    if (!resolvedProjectId && projectKey && folderPath) {
      try {
        resolvedProjectId = await getProjectId(projectKey);
      } catch {
        warnings.push('Folder linking skipped: Jira API credentials required for folder placement');
      }
    }

    // Link to Test Plans (multiple)
    if (testPlanIds && testPlanIds.length > 0) {
      for (const testPlanId of testPlanIds) {
        try {
          const result = await addTestsToTestPlan(testPlanId, [testIssueId]);
          results.testPlans.push({ id: testPlanId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Plan ${testPlanId}: ${result.warning}`);
          }
        } catch (error) {
          results.testPlans.push({ id: testPlanId, success: false, error: error.message });
          warnings.push(`Test Plan ${testPlanId} linking failed: ${error.message}`);
        }
      }
    }

    // Link to Test Executions (multiple)
    if (testExecutionIds && testExecutionIds.length > 0) {
      for (const testExecutionId of testExecutionIds) {
        try {
          const result = await addTestsToTestExecution(testExecutionId, [testIssueId]);
          results.testExecutions.push({ id: testExecutionId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Execution ${testExecutionId}: ${result.warning}`);
          }
        } catch (error) {
          results.testExecutions.push({ id: testExecutionId, success: false, error: error.message });
          warnings.push(`Test Execution ${testExecutionId} linking failed: ${error.message}`);
        }
      }
    }

    // Link to Test Sets (multiple)
    if (testSetIds && testSetIds.length > 0) {
      for (const testSetId of testSetIds) {
        try {
          const result = await addTestsToTestSet(testSetId, [testIssueId]);
          results.testSets.push({ id: testSetId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Set ${testSetId}: ${result.warning}`);
          }
        } catch (error) {
          results.testSets.push({ id: testSetId, success: false, error: error.message });
          warnings.push(`Test Set ${testSetId} linking failed: ${error.message}`);
        }
      }
    }

    // Add to Folder
    if (resolvedProjectId && folderPath) {
      try {
        results.folder = await addTestsToFolder(resolvedProjectId, folderPath, [testIssueId]);
        if (results.folder.warnings?.length) {
          warnings.push(`Folder: ${results.folder.warnings.join(', ')}`);
        }
      } catch (error) {
        warnings.push(`Folder linking failed: ${error.message}`);
      }
    }

    // Add Preconditions
    if (preconditionIds && preconditionIds.length > 0) {
      try {
        results.preconditions = await addPreconditionsToTest(testIssueId, preconditionIds);
        if (results.preconditions.warning) {
          warnings.push(`Preconditions: ${results.preconditions.warning}`);
        }
      } catch (error) {
        warnings.push(`Preconditions linking failed: ${error.message}`);
      }
    }

    res.json({
      success: true,
      results,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to link test',
    });
  }
});

/**
 * @swagger
 * /xray/update-links:
 *   post:
 *     summary: Update Xray links for a test (add and remove links)
 *     tags: [Xray]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testIssueId
 *               - diff
 *             properties:
 *               testIssueId:
 *                 type: string
 *               projectKey:
 *                 type: string
 *               projectId:
 *                 type: string
 *               diff:
 *                 type: object
 *                 properties:
 *                   testPlans:
 *                     type: object
 *                     properties:
 *                       toAdd:
 *                         type: array
 *                         items:
 *                           type: string
 *                       toRemove:
 *                         type: array
 *                         items:
 *                           type: string
 *                   testExecutions:
 *                     type: object
 *                   testSets:
 *                     type: object
 *                   preconditions:
 *                     type: object
 *                   folder:
 *                     type: object
 *                     properties:
 *                       original:
 *                         type: string
 *                       current:
 *                         type: string
 *     responses:
 *       200:
 *         description: Link update results
 */
router.post('/update-links', async (req, res) => {
  try {
    const {
      testIssueId,
      projectKey,
      projectId,
      diff,
      currentLinks,
    } = req.body;

    if (!testIssueId) {
      return res.status(400).json({
        success: false,
        error: 'Test issue ID is required',
      });
    }

    if (!diff) {
      return res.status(400).json({
        success: false,
        error: 'Diff object is required',
      });
    }

    const results = {
      testPlans: { added: [], removed: [] },
      testExecutions: { added: [], removed: [] },
      testSets: { added: [], removed: [] },
      folder: null,
      preconditions: { added: null, removed: null },
    };
    const warnings = [];

    // Try to get projectId if we have projectKey but no projectId
    let resolvedProjectId = projectId;
    if (!resolvedProjectId && projectKey) {
      try {
        resolvedProjectId = await getProjectId(projectKey);
      } catch {
        warnings.push('Could not resolve project ID for folder operations');
      }
    }

    // Test Plans - Add
    if (diff.testPlans?.toAdd?.length > 0) {
      for (const testPlanId of diff.testPlans.toAdd) {
        try {
          const result = await addTestsToTestPlan(testPlanId, [testIssueId]);
          results.testPlans.added.push({ id: testPlanId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Plan ${testPlanId} add: ${result.warning}`);
          }
        } catch (error) {
          results.testPlans.added.push({ id: testPlanId, success: false, error: error.message });
          warnings.push(`Test Plan ${testPlanId} add failed: ${error.message}`);
        }
      }
    }

    // Test Plans - Remove
    if (diff.testPlans?.toRemove?.length > 0) {
      for (const testPlanId of diff.testPlans.toRemove) {
        try {
          const result = await removeTestsFromTestPlan(testPlanId, [testIssueId]);
          results.testPlans.removed.push({ id: testPlanId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Plan ${testPlanId} remove: ${result.warning}`);
          }
        } catch (error) {
          results.testPlans.removed.push({ id: testPlanId, success: false, error: error.message });
          warnings.push(`Test Plan ${testPlanId} remove failed: ${error.message}`);
        }
      }
    }

    // Test Executions - Add
    if (diff.testExecutions?.toAdd?.length > 0) {
      for (const testExecutionId of diff.testExecutions.toAdd) {
        try {
          const result = await addTestsToTestExecution(testExecutionId, [testIssueId]);
          results.testExecutions.added.push({ id: testExecutionId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Execution ${testExecutionId} add: ${result.warning}`);
          }
        } catch (error) {
          results.testExecutions.added.push({ id: testExecutionId, success: false, error: error.message });
          warnings.push(`Test Execution ${testExecutionId} add failed: ${error.message}`);
        }
      }
    }

    // Test Executions - Remove
    if (diff.testExecutions?.toRemove?.length > 0) {
      for (const testExecutionId of diff.testExecutions.toRemove) {
        try {
          const result = await removeTestsFromTestExecution(testExecutionId, [testIssueId]);
          results.testExecutions.removed.push({ id: testExecutionId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Execution ${testExecutionId} remove: ${result.warning}`);
          }
        } catch (error) {
          results.testExecutions.removed.push({ id: testExecutionId, success: false, error: error.message });
          warnings.push(`Test Execution ${testExecutionId} remove failed: ${error.message}`);
        }
      }
    }

    // Test Sets - Add
    if (diff.testSets?.toAdd?.length > 0) {
      for (const testSetId of diff.testSets.toAdd) {
        try {
          const result = await addTestsToTestSet(testSetId, [testIssueId]);
          results.testSets.added.push({ id: testSetId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Set ${testSetId} add: ${result.warning}`);
          }
        } catch (error) {
          results.testSets.added.push({ id: testSetId, success: false, error: error.message });
          warnings.push(`Test Set ${testSetId} add failed: ${error.message}`);
        }
      }
    }

    // Test Sets - Remove
    if (diff.testSets?.toRemove?.length > 0) {
      for (const testSetId of diff.testSets.toRemove) {
        try {
          const result = await removeTestsFromTestSet(testSetId, [testIssueId]);
          results.testSets.removed.push({ id: testSetId, success: true, result });
          if (result.warning) {
            warnings.push(`Test Set ${testSetId} remove: ${result.warning}`);
          }
        } catch (error) {
          results.testSets.removed.push({ id: testSetId, success: false, error: error.message });
          warnings.push(`Test Set ${testSetId} remove failed: ${error.message}`);
        }
      }
    }

    // Folder - Move to new folder if changed
    if (diff.folder && diff.folder.original !== diff.folder.current && resolvedProjectId) {
      try {
        // Remove from old folder (if not root)
        if (diff.folder.original && diff.folder.original !== '/') {
          try {
            await removeTestsFromFolder(resolvedProjectId, diff.folder.original, [testIssueId]);
          } catch (error) {
            warnings.push(`Folder remove from ${diff.folder.original} failed: ${error.message}`);
          }
        }

        // Add to new folder
        if (diff.folder.current && diff.folder.current !== '/') {
          const folderResult = await addTestsToFolder(resolvedProjectId, diff.folder.current, [testIssueId]);
          results.folder = folderResult;
          if (folderResult.warnings?.length) {
            warnings.push(`Folder: ${folderResult.warnings.join(', ')}`);
          }
        }
      } catch (error) {
        warnings.push(`Folder update failed: ${error.message}`);
      }
    }

    // Preconditions - Add
    if (diff.preconditions?.toAdd?.length > 0) {
      try {
        results.preconditions.added = await addPreconditionsToTest(testIssueId, diff.preconditions.toAdd);
        if (results.preconditions.added.warning) {
          warnings.push(`Preconditions add: ${results.preconditions.added.warning}`);
        }
      } catch (error) {
        warnings.push(`Preconditions add failed: ${error.message}`);
      }
    }

    // Preconditions - Remove
    if (diff.preconditions?.toRemove?.length > 0) {
      try {
        results.preconditions.removed = await removePreconditionsFromTest(testIssueId, diff.preconditions.toRemove);
        if (results.preconditions.removed.warning) {
          warnings.push(`Preconditions remove: ${results.preconditions.removed.warning}`);
        }
      } catch (error) {
        warnings.push(`Preconditions remove failed: ${error.message}`);
      }
    }

    res.json({
      success: true,
      results,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update links',
    });
  }
});

export default router;
