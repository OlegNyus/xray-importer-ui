import express from 'express';
import { randomUUID } from 'crypto';
import {
  readConfig,
  readSettings,
  listDrafts,
  readDraft,
  writeDraft,
  deleteDraft,
} from '../utils/fileOperations.js';
import { importToXrayAndWait } from '../utils/xrayClient.js';

const router = express.Router();

/**
 * Check if test case has all required fields for import
 */
function isComplete(draft) {
  const hasRequiredFields =
    draft.summary?.trim() &&
    draft.description?.trim() &&
    draft.testType &&
    Array.isArray(draft.steps) &&
    draft.steps.length > 0;

  if (!hasRequiredFields) {
    return false;
  }

  const allStepsComplete = draft.steps.every(
    (step) => step.action?.trim() && step.result?.trim()
  );

  return allStepsComplete;
}

/**
 * Determine status - only 'draft' or 'imported'
 * - 'imported' is permanent once set
 * - Everything else is 'draft'
 */
function determineStatus(draft, existingStatus) {
  // Imported status is permanent
  if (existingStatus === 'imported' || draft.status === 'imported') {
    return 'imported';
  }
  // Everything else is draft
  return 'draft';
}

/**
 * @swagger
 * /drafts:
 *   get:
 *     summary: List all drafts
 *     tags: [Drafts]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Filter by project key (uses active project if not specified)
 *     responses:
 *       200:
 *         description: List of drafts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 drafts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Draft'
 */
router.get('/', (req, res) => {
  try {
    // Get project from query or use active project
    let projectKey = req.query.project;
    if (!projectKey) {
      const settings = readSettings();
      projectKey = settings.activeProject;
    }

    const drafts = listDrafts(projectKey).map((draft) => ({
      ...draft,
      // Compute isComplete if not present (for older drafts)
      isComplete: draft.isComplete !== undefined ? draft.isComplete : isComplete(draft),
    }));
    res.json({ success: true, drafts, projectKey });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list drafts',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/{id}:
 *   get:
 *     summary: Get single draft
 *     tags: [Drafts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draft found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 draft:
 *                   $ref: '#/components/schemas/Draft'
 *       404:
 *         description: Draft not found
 */
router.get('/:id', (req, res) => {
  try {
    const draft = readDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }
    // Compute isComplete if not present
    const draftWithComplete = {
      ...draft,
      isComplete: draft.isComplete !== undefined ? draft.isComplete : isComplete(draft),
    };
    res.json({ success: true, draft: draftWithComplete });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read draft',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts:
 *   post:
 *     summary: Create new draft
 *     tags: [Drafts]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Project key (uses active project if not specified)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               draft:
 *                 $ref: '#/components/schemas/Draft'
 *     responses:
 *       200:
 *         description: Draft created
 *       400:
 *         description: Draft data required
 */
router.post('/', (req, res) => {
  try {
    const { draft } = req.body;
    if (!draft) {
      return res.status(400).json({ success: false, error: 'Draft data required' });
    }

    // Get project from query, draft, or use active project
    let projectKey = req.query.project || draft.projectKey;
    if (!projectKey) {
      const settings = readSettings();
      projectKey = settings.activeProject;
    }

    if (!projectKey) {
      return res.status(400).json({ success: false, error: 'No project specified' });
    }

    const id = randomUUID();
    const now = Date.now();

    const newDraft = {
      ...draft,
      id,
      projectKey,
      status: determineStatus(draft, null),
      isComplete: isComplete(draft),
      createdAt: now,
      updatedAt: now,
    };

    const filePath = writeDraft(id, newDraft);

    res.json({
      success: true,
      id,
      draft: newDraft,
      filePath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create draft',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/{id}:
 *   put:
 *     summary: Update existing draft
 *     tags: [Drafts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               draft:
 *                 $ref: '#/components/schemas/Draft'
 *     responses:
 *       200:
 *         description: Draft updated
 *       404:
 *         description: Draft not found
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { draft } = req.body;

    if (!draft) {
      return res.status(400).json({ success: false, error: 'Draft data required' });
    }

    const existing = readDraft(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    // Use provided projectKey, or keep existing
    const projectKey = draft.projectKey || existing.projectKey;

    const updatedDraft = {
      ...draft,
      id,
      projectKey,
      status: determineStatus(draft, existing.status),
      isComplete: isComplete(draft),
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    const filePath = writeDraft(id, updatedDraft);

    res.json({
      success: true,
      draft: updatedDraft,
      filePath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update draft',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/{id}:
 *   delete:
 *     summary: Delete draft
 *     tags: [Drafts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draft deleted
 *       404:
 *         description: Draft not found
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteDraft(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete draft',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/{id}/status:
 *   patch:
 *     summary: Update draft status
 *     tags: [Drafts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, imported]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Draft not found
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'imported'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const draft = readDraft(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    const updatedDraft = {
      ...draft,
      status,
      updatedAt: Date.now(),
      importedAt: status === 'imported' ? Date.now() : draft.importedAt,
    };

    writeDraft(id, updatedDraft);

    res.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/{id}/xray-links:
 *   patch:
 *     summary: Update draft xrayLinking data
 *     tags: [Drafts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               xrayLinking:
 *                 type: object
 *                 description: Updated xrayLinking data
 *     responses:
 *       200:
 *         description: xrayLinking updated
 *       400:
 *         description: xrayLinking data required
 *       404:
 *         description: Draft not found
 */
router.patch('/:id/xray-links', (req, res) => {
  try {
    const { id } = req.params;
    const { xrayLinking } = req.body;

    if (!xrayLinking) {
      return res.status(400).json({ success: false, error: 'xrayLinking data required' });
    }

    const draft = readDraft(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    const updatedDraft = {
      ...draft,
      xrayLinking,
      updatedAt: Date.now(),
    };

    writeDraft(id, updatedDraft);

    res.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update xrayLinking',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/{id}/import:
 *   post:
 *     summary: Import single draft to Xray
 *     tags: [Import]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Import initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobId:
 *                   type: string
 *       400:
 *         description: Config not found or already imported
 *       404:
 *         description: Draft not found
 */
router.post('/:id/import', async (req, res) => {
  try {
    const config = readConfig();
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Config not found. Please configure the application first.',
      });
    }

    const draft = readDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found',
      });
    }

    if (draft.status === 'imported') {
      return res.status(400).json({
        success: false,
        error: 'This test case has already been imported.',
      });
    }

    if (!isComplete(draft)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot import incomplete test case. Please complete all required fields.',
      });
    }

    // Import directly to Xray and wait for completion
    const result = await importToXrayAndWait([{
      summary: draft.summary,
      description: draft.description || '',
      testType: draft.testType,
      labels: draft.labels || [],
      steps: draft.steps || [],
      projectKey: draft.projectKey,
    }], draft.projectKey);

    // Mark as imported immediately on success
    if (result.success) {
      const updatedDraft = {
        ...draft,
        status: 'imported',
        importedAt: Date.now(),
        updatedAt: Date.now(),
        testIssueId: result.testIssueIds?.[0],
        testKey: result.testKeys?.[0],
      };
      writeDraft(draft.id, updatedDraft);
    }

    res.json({
      success: result.success,
      jobId: result.jobId,
      testIssueId: result.testIssueIds?.[0],
      testKey: result.testKeys?.[0],
      message: result.success ? 'Import successful' : (result.error || 'Import failed'),
      error: result.error,
      draftId: draft.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Import failed',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/bulk-import:
 *   post:
 *     summary: Import multiple drafts to Xray
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Bulk import initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobId:
 *                   type: string
 *                 importedCount:
 *                   type: integer
 *       400:
 *         description: No IDs provided or config not found
 */
router.post('/bulk-import', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No draft IDs provided',
      });
    }

    const config = readConfig();
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Config not found. Please configure the application first.',
      });
    }

    const drafts = [];
    for (const id of ids) {
      const draft = readDraft(id);
      if (!draft) {
        return res.status(404).json({
          success: false,
          error: `Draft ${id} not found`,
        });
      }
      if (draft.status === 'imported') {
        return res.status(400).json({
          success: false,
          error: `Test case already imported: ${draft.summary || id}`,
        });
      }
      if (!isComplete(draft)) {
        return res.status(400).json({
          success: false,
          error: `Cannot import incomplete test case: ${draft.summary || id}`,
        });
      }
      drafts.push(draft);
    }

    // Import directly to Xray and wait for completion
    const testCasesForImport = drafts.map((draft) => ({
      summary: draft.summary,
      description: draft.description || '',
      testType: draft.testType,
      labels: draft.labels || [],
      steps: draft.steps || [],
      projectKey: draft.projectKey,
    }));

    // Use first draft's projectKey for bulk import (all should be same project)
    const result = await importToXrayAndWait(testCasesForImport, drafts[0]?.projectKey);

    // Mark all drafts as imported immediately on success
    if (result.success) {
      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i];
        const updatedDraft = {
          ...draft,
          status: 'imported',
          importedAt: Date.now(),
          updatedAt: Date.now(),
          testIssueId: result.testIssueIds?.[i],
          testKey: result.testKeys?.[i],
        };
        writeDraft(draft.id, updatedDraft);
      }
    }

    res.json({
      success: result.success,
      jobId: result.jobId,
      testIssueIds: result.testIssueIds,
      testKeys: result.testKeys,
      message: result.success ? 'Import successful' : (result.error || 'Import failed'),
      error: result.error,
      importedCount: drafts.length,
      draftIds: ids,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Bulk import failed',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /drafts/migrate:
 *   post:
 *     summary: Migrate localStorage data to file system
 *     tags: [Drafts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testCases:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Draft'
 *     responses:
 *       200:
 *         description: Migration successful
 *       400:
 *         description: testCases must be an array
 */
router.post('/migrate', (req, res) => {
  try {
    const { testCases } = req.body;

    if (!Array.isArray(testCases)) {
      return res.status(400).json({
        success: false,
        error: 'testCases must be an array',
      });
    }

    const migrated = [];
    for (const tc of testCases) {
      const id = tc.id || randomUUID();
      const draft = {
        ...tc,
        id,
        status: determineStatus(tc),
        createdAt: tc.createdAt || Date.now(),
        updatedAt: tc.updatedAt || Date.now(),
      };
      delete draft.isComplete;
      writeDraft(id, draft);
      migrated.push(id);
    }

    res.json({
      success: true,
      migrated: migrated.length,
      ids: migrated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message,
    });
  }
});

export default router;
