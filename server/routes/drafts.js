import express from 'express';
import { randomUUID } from 'crypto';
import {
  readConfig,
  listDrafts,
  readDraft,
  writeDraft,
  deleteDraft,
} from '../utils/fileOperations.js';
import { importToXray } from '../utils/xrayClient.js';

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
 * GET /api/drafts
 * List all drafts
 */
router.get('/', (req, res) => {
  try {
    const drafts = listDrafts().map((draft) => ({
      ...draft,
      // Compute isComplete if not present (for older drafts)
      isComplete: draft.isComplete !== undefined ? draft.isComplete : isComplete(draft),
    }));
    res.json({ success: true, drafts });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list drafts',
      details: error.message,
    });
  }
});

/**
 * GET /api/drafts/:id
 * Get single draft
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
 * POST /api/drafts
 * Create new draft
 */
router.post('/', (req, res) => {
  try {
    const { draft } = req.body;
    if (!draft) {
      return res.status(400).json({ success: false, error: 'Draft data required' });
    }

    const id = randomUUID();
    const now = Date.now();

    const newDraft = {
      ...draft,
      id,
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
 * PUT /api/drafts/:id
 * Update existing draft
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

    const updatedDraft = {
      ...draft,
      id,
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
 * DELETE /api/drafts/:id
 * Delete draft
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
 * PATCH /api/drafts/:id/status
 * Update draft status (for marking as imported)
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
 * POST /api/drafts/:id/import
 * Import single draft
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

    // Import directly to Xray (no temp file needed)
    const result = await importToXray([{
      summary: draft.summary,
      description: draft.description || '',
      testType: draft.testType,
      labels: draft.labels || [],
      steps: draft.steps || [],
    }]);

    // Mark as imported immediately on success
    if (result.success) {
      const updatedDraft = {
        ...draft,
        status: 'imported',
        importedAt: Date.now(),
        updatedAt: Date.now(),
      };
      writeDraft(draft.id, updatedDraft);
    }

    res.json({
      success: result.success,
      jobId: result.jobId,
      message: result.message || result.error || 'Import failed',
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
 * POST /api/drafts/bulk-import
 * Import multiple drafts
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

    // Import directly to Xray (no temp file needed)
    const testCasesForImport = drafts.map((draft) => ({
      summary: draft.summary,
      description: draft.description || '',
      testType: draft.testType,
      labels: draft.labels || [],
      steps: draft.steps || [],
    }));

    const result = await importToXray(testCasesForImport);

    // Mark all drafts as imported immediately on success
    if (result.success) {
      for (const draft of drafts) {
        const updatedDraft = {
          ...draft,
          status: 'imported',
          importedAt: Date.now(),
          updatedAt: Date.now(),
        };
        writeDraft(draft.id, updatedDraft);
      }
    }

    res.json({
      success: result.success,
      jobId: result.jobId,
      message: result.message || result.error || 'Import failed',
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
 * POST /api/drafts/migrate
 * Migrate localStorage data to file system
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
