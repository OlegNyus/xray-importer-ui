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

    // Build array of all linking operations to run in parallel
    const linkingPromises = [];

    // Test Plan linking promises
    if (testPlanIds && testPlanIds.length > 0) {
      for (const testPlanId of testPlanIds) {
        linkingPromises.push(
          addTestsToTestPlan(testPlanId, [testIssueId])
            .then((result) => ({ type: 'testPlan', id: testPlanId, success: true, result }))
            .catch((error) => ({ type: 'testPlan', id: testPlanId, success: false, error: error.message }))
        );
      }
    }

    // Test Execution linking promises
    if (testExecutionIds && testExecutionIds.length > 0) {
      for (const testExecutionId of testExecutionIds) {
        linkingPromises.push(
          addTestsToTestExecution(testExecutionId, [testIssueId])
            .then((result) => ({ type: 'testExecution', id: testExecutionId, success: true, result }))
            .catch((error) => ({ type: 'testExecution', id: testExecutionId, success: false, error: error.message }))
        );
      }
    }

    // Test Set linking promises
    if (testSetIds && testSetIds.length > 0) {
      for (const testSetId of testSetIds) {
        linkingPromises.push(
          addTestsToTestSet(testSetId, [testIssueId])
            .then((result) => ({ type: 'testSet', id: testSetId, success: true, result }))
            .catch((error) => ({ type: 'testSet', id: testSetId, success: false, error: error.message }))
        );
      }
    }

    // Folder linking promise
    if (resolvedProjectId && folderPath) {
      linkingPromises.push(
        addTestsToFolder(resolvedProjectId, folderPath, [testIssueId])
          .then((result) => ({ type: 'folder', success: true, result }))
          .catch((error) => ({ type: 'folder', success: false, error: error.message }))
      );
    }

    // Preconditions linking promise
    if (preconditionIds && preconditionIds.length > 0) {
      linkingPromises.push(
        addPreconditionsToTest(testIssueId, preconditionIds)
          .then((result) => ({ type: 'preconditions', success: true, result }))
          .catch((error) => ({ type: 'preconditions', success: false, error: error.message }))
      );
    }

    // Execute all linking operations in parallel
    const linkingResults = await Promise.all(linkingPromises);

    // Process results and collect warnings
    for (const linkResult of linkingResults) {
      switch (linkResult.type) {
        case 'testPlan':
          results.testPlans.push({ id: linkResult.id, success: linkResult.success, result: linkResult.result });
          if (!linkResult.success) {
            warnings.push(`Test Plan ${linkResult.id} linking failed: ${linkResult.error}`);
          } else if (linkResult.result?.warning) {
            warnings.push(`Test Plan ${linkResult.id}: ${linkResult.result.warning}`);
          }
          break;

        case 'testExecution':
          results.testExecutions.push({ id: linkResult.id, success: linkResult.success, result: linkResult.result });
          if (!linkResult.success) {
            warnings.push(`Test Execution ${linkResult.id} linking failed: ${linkResult.error}`);
          } else if (linkResult.result?.warning) {
            warnings.push(`Test Execution ${linkResult.id}: ${linkResult.result.warning}`);
          }
          break;

        case 'testSet':
          results.testSets.push({ id: linkResult.id, success: linkResult.success, result: linkResult.result });
          if (!linkResult.success) {
            warnings.push(`Test Set ${linkResult.id} linking failed: ${linkResult.error}`);
          } else if (linkResult.result?.warning) {
            warnings.push(`Test Set ${linkResult.id}: ${linkResult.result.warning}`);
          }
          break;

        case 'folder':
          if (linkResult.success) {
            results.folder = linkResult.result;
            if (linkResult.result?.warnings?.length) {
              warnings.push(`Folder: ${linkResult.result.warnings.join(', ')}`);
            }
          } else {
            warnings.push(`Folder linking failed: ${linkResult.error}`);
          }
          break;

        case 'preconditions':
          if (linkResult.success) {
            results.preconditions = linkResult.result;
            if (linkResult.result?.warning) {
              warnings.push(`Preconditions: ${linkResult.result.warning}`);
            }
          } else {
            warnings.push(`Preconditions linking failed: ${linkResult.error}`);
          }
          break;
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

    // Build array of all link update operations to run in parallel
    const updatePromises = [];

    // Test Plans - Add
    if (diff.testPlans?.toAdd?.length > 0) {
      for (const testPlanId of diff.testPlans.toAdd) {
        updatePromises.push(
          addTestsToTestPlan(testPlanId, [testIssueId])
            .then((result) => ({ type: 'testPlan', action: 'add', id: testPlanId, success: true, result }))
            .catch((error) => ({ type: 'testPlan', action: 'add', id: testPlanId, success: false, error: error.message }))
        );
      }
    }

    // Test Plans - Remove
    if (diff.testPlans?.toRemove?.length > 0) {
      for (const testPlanId of diff.testPlans.toRemove) {
        updatePromises.push(
          removeTestsFromTestPlan(testPlanId, [testIssueId])
            .then((result) => ({ type: 'testPlan', action: 'remove', id: testPlanId, success: true, result }))
            .catch((error) => ({ type: 'testPlan', action: 'remove', id: testPlanId, success: false, error: error.message }))
        );
      }
    }

    // Test Executions - Add
    if (diff.testExecutions?.toAdd?.length > 0) {
      for (const testExecutionId of diff.testExecutions.toAdd) {
        updatePromises.push(
          addTestsToTestExecution(testExecutionId, [testIssueId])
            .then((result) => ({ type: 'testExecution', action: 'add', id: testExecutionId, success: true, result }))
            .catch((error) => ({ type: 'testExecution', action: 'add', id: testExecutionId, success: false, error: error.message }))
        );
      }
    }

    // Test Executions - Remove
    if (diff.testExecutions?.toRemove?.length > 0) {
      for (const testExecutionId of diff.testExecutions.toRemove) {
        updatePromises.push(
          removeTestsFromTestExecution(testExecutionId, [testIssueId])
            .then((result) => ({ type: 'testExecution', action: 'remove', id: testExecutionId, success: true, result }))
            .catch((error) => ({ type: 'testExecution', action: 'remove', id: testExecutionId, success: false, error: error.message }))
        );
      }
    }

    // Test Sets - Add
    if (diff.testSets?.toAdd?.length > 0) {
      for (const testSetId of diff.testSets.toAdd) {
        updatePromises.push(
          addTestsToTestSet(testSetId, [testIssueId])
            .then((result) => ({ type: 'testSet', action: 'add', id: testSetId, success: true, result }))
            .catch((error) => ({ type: 'testSet', action: 'add', id: testSetId, success: false, error: error.message }))
        );
      }
    }

    // Test Sets - Remove
    if (diff.testSets?.toRemove?.length > 0) {
      for (const testSetId of diff.testSets.toRemove) {
        updatePromises.push(
          removeTestsFromTestSet(testSetId, [testIssueId])
            .then((result) => ({ type: 'testSet', action: 'remove', id: testSetId, success: true, result }))
            .catch((error) => ({ type: 'testSet', action: 'remove', id: testSetId, success: false, error: error.message }))
        );
      }
    }

    // Folder - Move to new folder if changed (must be sequential: remove then add)
    if (diff.folder && diff.folder.original !== diff.folder.current && resolvedProjectId) {
      updatePromises.push(
        (async () => {
          const folderWarnings = [];
          try {
            // Remove from old folder (if not root)
            if (diff.folder.original && diff.folder.original !== '/') {
              try {
                await removeTestsFromFolder(resolvedProjectId, diff.folder.original, [testIssueId]);
              } catch (error) {
                folderWarnings.push(`Folder remove from ${diff.folder.original} failed: ${error.message}`);
              }
            }

            // Add to new folder
            if (diff.folder.current && diff.folder.current !== '/') {
              const folderResult = await addTestsToFolder(resolvedProjectId, diff.folder.current, [testIssueId]);
              return { type: 'folder', action: 'move', success: true, result: folderResult, warnings: folderWarnings };
            }

            return { type: 'folder', action: 'move', success: true, result: null, warnings: folderWarnings };
          } catch (error) {
            return { type: 'folder', action: 'move', success: false, error: error.message, warnings: folderWarnings };
          }
        })()
      );
    }

    // Preconditions - Add
    if (diff.preconditions?.toAdd?.length > 0) {
      updatePromises.push(
        addPreconditionsToTest(testIssueId, diff.preconditions.toAdd)
          .then((result) => ({ type: 'preconditions', action: 'add', success: true, result }))
          .catch((error) => ({ type: 'preconditions', action: 'add', success: false, error: error.message }))
      );
    }

    // Preconditions - Remove
    if (diff.preconditions?.toRemove?.length > 0) {
      updatePromises.push(
        removePreconditionsFromTest(testIssueId, diff.preconditions.toRemove)
          .then((result) => ({ type: 'preconditions', action: 'remove', success: true, result }))
          .catch((error) => ({ type: 'preconditions', action: 'remove', success: false, error: error.message }))
      );
    }

    // Execute all update operations in parallel
    const updateResults = await Promise.all(updatePromises);

    // Process results and collect warnings
    for (const updateResult of updateResults) {
      switch (updateResult.type) {
        case 'testPlan':
          if (updateResult.action === 'add') {
            results.testPlans.added.push({ id: updateResult.id, success: updateResult.success, result: updateResult.result });
            if (!updateResult.success) {
              warnings.push(`Test Plan ${updateResult.id} add failed: ${updateResult.error}`);
            } else if (updateResult.result?.warning) {
              warnings.push(`Test Plan ${updateResult.id} add: ${updateResult.result.warning}`);
            }
          } else {
            results.testPlans.removed.push({ id: updateResult.id, success: updateResult.success, result: updateResult.result });
            if (!updateResult.success) {
              warnings.push(`Test Plan ${updateResult.id} remove failed: ${updateResult.error}`);
            } else if (updateResult.result?.warning) {
              warnings.push(`Test Plan ${updateResult.id} remove: ${updateResult.result.warning}`);
            }
          }
          break;

        case 'testExecution':
          if (updateResult.action === 'add') {
            results.testExecutions.added.push({ id: updateResult.id, success: updateResult.success, result: updateResult.result });
            if (!updateResult.success) {
              warnings.push(`Test Execution ${updateResult.id} add failed: ${updateResult.error}`);
            } else if (updateResult.result?.warning) {
              warnings.push(`Test Execution ${updateResult.id} add: ${updateResult.result.warning}`);
            }
          } else {
            results.testExecutions.removed.push({ id: updateResult.id, success: updateResult.success, result: updateResult.result });
            if (!updateResult.success) {
              warnings.push(`Test Execution ${updateResult.id} remove failed: ${updateResult.error}`);
            } else if (updateResult.result?.warning) {
              warnings.push(`Test Execution ${updateResult.id} remove: ${updateResult.result.warning}`);
            }
          }
          break;

        case 'testSet':
          if (updateResult.action === 'add') {
            results.testSets.added.push({ id: updateResult.id, success: updateResult.success, result: updateResult.result });
            if (!updateResult.success) {
              warnings.push(`Test Set ${updateResult.id} add failed: ${updateResult.error}`);
            } else if (updateResult.result?.warning) {
              warnings.push(`Test Set ${updateResult.id} add: ${updateResult.result.warning}`);
            }
          } else {
            results.testSets.removed.push({ id: updateResult.id, success: updateResult.success, result: updateResult.result });
            if (!updateResult.success) {
              warnings.push(`Test Set ${updateResult.id} remove failed: ${updateResult.error}`);
            } else if (updateResult.result?.warning) {
              warnings.push(`Test Set ${updateResult.id} remove: ${updateResult.result.warning}`);
            }
          }
          break;

        case 'folder':
          // Add any folder operation warnings (e.g., remove failures)
          if (updateResult.warnings?.length) {
            warnings.push(...updateResult.warnings);
          }
          if (updateResult.success) {
            results.folder = updateResult.result;
            if (updateResult.result?.warnings?.length) {
              warnings.push(`Folder: ${updateResult.result.warnings.join(', ')}`);
            }
          } else {
            warnings.push(`Folder update failed: ${updateResult.error}`);
          }
          break;

        case 'preconditions':
          if (updateResult.action === 'add') {
            if (updateResult.success) {
              results.preconditions.added = updateResult.result;
              if (updateResult.result?.warning) {
                warnings.push(`Preconditions add: ${updateResult.result.warning}`);
              }
            } else {
              warnings.push(`Preconditions add failed: ${updateResult.error}`);
            }
          } else {
            if (updateResult.success) {
              results.preconditions.removed = updateResult.result;
              if (updateResult.result?.warning) {
                warnings.push(`Preconditions remove: ${updateResult.result.warning}`);
              }
            } else {
              warnings.push(`Preconditions remove failed: ${updateResult.error}`);
            }
          }
          break;
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
