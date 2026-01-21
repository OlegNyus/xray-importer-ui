import express from 'express';
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

const router = express.Router();

// ============ Global Settings ============

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings retrieved
 */
router.get('/', (req, res) => {
  try {
    const settings = readSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read settings',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings:
 *   put:
 *     summary: Update all settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Settings saved
 *       400:
 *         description: Settings required
 */
router.put('/', (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ success: false, error: 'Settings required' });
    }
    writeSettings(settings);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save settings',
      details: error.message,
    });
  }
});

// ============ Project Management ============

/**
 * @swagger
 * /settings/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/projects', (req, res) => {
  try {
    // Use synced settings to auto-remove projects whose folders were deleted
    const settings = getSettingsSynced();
    res.json({
      success: true,
      projects: settings.projects || [],
      hiddenProjects: settings.hiddenProjects || [],
      activeProject: settings.activeProject,
      projectSettings: settings.projectSettings || {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read projects',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings/projects:
 *   post:
 *     summary: Add a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectKey
 *             properties:
 *               projectKey:
 *                 type: string
 *                 pattern: '^[A-Z]+$'
 *     responses:
 *       200:
 *         description: Project added
 *       400:
 *         description: Invalid project key
 */
router.post('/projects', (req, res) => {
  try {
    const { projectKey, color } = req.body;

    if (!projectKey || typeof projectKey !== 'string' || !/^[A-Z]+$/.test(projectKey)) {
      return res.status(400).json({
        success: false,
        error: 'Project key must be uppercase letters only',
      });
    }

    const result = addProject(projectKey, color);
    const settings = readSettings();

    res.json({
      success: true,
      alreadyExists: result.alreadyExists || false,
      projects: settings.projects,
      activeProject: settings.activeProject,
      projectSettings: settings.projectSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add project',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings/projects/{projectKey}/hide:
 *   post:
 *     summary: Hide a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project hidden
 */
router.post('/projects/:projectKey/hide', (req, res) => {
  try {
    const { projectKey } = req.params;
    hideProject(projectKey);
    const settings = readSettings();

    res.json({
      success: true,
      hiddenProjects: settings.hiddenProjects,
      activeProject: settings.activeProject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to hide project',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings/projects/{projectKey}/unhide:
 *   post:
 *     summary: Unhide a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project unhidden
 */
router.post('/projects/:projectKey/unhide', (req, res) => {
  try {
    const { projectKey } = req.params;
    unhideProject(projectKey);
    const settings = readSettings();

    res.json({
      success: true,
      hiddenProjects: settings.hiddenProjects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unhide project',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings/projects/{projectKey}/activate:
 *   post:
 *     summary: Set active project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active project set
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectKey/activate', (req, res) => {
  try {
    const { projectKey } = req.params;
    const result = setActiveProject(projectKey);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      activeProject: projectKey,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to set active project',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings/projects/{projectKey}:
 *   get:
 *     summary: Get project settings
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project settings
 */
router.get('/projects/:projectKey', (req, res) => {
  try {
    const { projectKey } = req.params;
    const projectSettings = getProjectSettings(projectKey);

    res.json({
      success: true,
      projectKey,
      settings: projectSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get project settings',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /settings/projects/{projectKey}:
 *   put:
 *     summary: Update project settings
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectKey
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
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Project settings updated
 */
router.put('/projects/:projectKey', (req, res) => {
  try {
    const { projectKey } = req.params;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ success: false, error: 'Settings required' });
    }

    saveProjectSettings(projectKey, settings);

    res.json({
      success: true,
      projectKey,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save project settings',
      details: error.message,
    });
  }
});

// ============ Per-Project Settings (Functional Areas, Labels, Collections) ============

/**
 * @swagger
 * /settings/functional-areas:
 *   get:
 *     summary: Get functional areas for active project
 *     tags: [Settings]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Project key (uses active project if not specified)
 *     responses:
 *       200:
 *         description: List of functional areas
 */
router.get('/functional-areas', (req, res) => {
  try {
    const projectKey = req.query.project;
    if (projectKey) {
      const projectSettings = getProjectSettings(projectKey);
      return res.json({ success: true, areas: projectSettings.functionalAreas || [] });
    }
    // Fallback: get from active project or global settings
    const settings = readSettings();
    if (settings.activeProject) {
      const projectSettings = getProjectSettings(settings.activeProject);
      return res.json({ success: true, areas: projectSettings.functionalAreas || [] });
    }
    res.json({ success: true, areas: settings.functionalAreas || [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read functional areas',
    });
  }
});

/**
 * @swagger
 * /settings/functional-areas:
 *   put:
 *     summary: Update functional areas for active project
 *     tags: [Settings]
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
 *               areas:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Areas saved
 *       400:
 *         description: Areas must be an array
 */
router.put('/functional-areas', (req, res) => {
  try {
    const { areas } = req.body;
    const projectKey = req.query.project;

    if (!Array.isArray(areas)) {
      return res.status(400).json({ success: false, error: 'Areas must be an array' });
    }

    const settings = readSettings();
    const targetProject = projectKey || settings.activeProject;

    if (targetProject) {
      const projectSettings = getProjectSettings(targetProject);
      projectSettings.functionalAreas = areas;
      saveProjectSettings(targetProject, projectSettings);
    } else {
      // Fallback to global settings
      settings.functionalAreas = areas;
      writeSettings(settings);
    }

    res.json({ success: true, areas });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save functional areas',
    });
  }
});

/**
 * @swagger
 * /settings/labels:
 *   get:
 *     summary: Get labels for active project
 *     tags: [Settings]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Project key (uses active project if not specified)
 *     responses:
 *       200:
 *         description: List of labels
 */
router.get('/labels', (req, res) => {
  try {
    const projectKey = req.query.project;
    if (projectKey) {
      const projectSettings = getProjectSettings(projectKey);
      return res.json({ success: true, labels: projectSettings.labels || [] });
    }
    const settings = readSettings();
    if (settings.activeProject) {
      const projectSettings = getProjectSettings(settings.activeProject);
      return res.json({ success: true, labels: projectSettings.labels || [] });
    }
    res.json({ success: true, labels: settings.labels || [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read labels',
    });
  }
});

/**
 * @swagger
 * /settings/labels:
 *   put:
 *     summary: Update labels for active project
 *     tags: [Settings]
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
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Labels saved
 *       400:
 *         description: Labels must be an array
 */
router.put('/labels', (req, res) => {
  try {
    const { labels } = req.body;
    const projectKey = req.query.project;

    if (!Array.isArray(labels)) {
      return res.status(400).json({ success: false, error: 'Labels must be an array' });
    }

    const settings = readSettings();
    const targetProject = projectKey || settings.activeProject;

    if (targetProject) {
      const projectSettings = getProjectSettings(targetProject);
      projectSettings.labels = labels;
      saveProjectSettings(targetProject, projectSettings);
    } else {
      settings.labels = labels;
      writeSettings(settings);
    }

    res.json({ success: true, labels });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save labels',
    });
  }
});

/**
 * @swagger
 * /settings/collections:
 *   get:
 *     summary: Get collections for active project
 *     tags: [Collections]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Project key (uses active project if not specified)
 *     responses:
 *       200:
 *         description: List of collections
 */
router.get('/collections', (req, res) => {
  try {
    const projectKey = req.query.project;
    if (projectKey) {
      const projectSettings = getProjectSettings(projectKey);
      return res.json({ success: true, collections: projectSettings.collections || [] });
    }
    const settings = readSettings();
    if (settings.activeProject) {
      const projectSettings = getProjectSettings(settings.activeProject);
      return res.json({ success: true, collections: projectSettings.collections || [] });
    }
    res.json({ success: true, collections: settings.collections || [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read collections',
    });
  }
});

/**
 * @swagger
 * /settings/collections:
 *   put:
 *     summary: Update all collections for active project
 *     tags: [Collections]
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
 *               collections:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Collection'
 *     responses:
 *       200:
 *         description: Collections saved
 *       400:
 *         description: Collections must be an array
 */
router.put('/collections', (req, res) => {
  try {
    const { collections } = req.body;
    const projectKey = req.query.project;

    if (!Array.isArray(collections)) {
      return res.status(400).json({ success: false, error: 'Collections must be an array' });
    }

    const settings = readSettings();
    const targetProject = projectKey || settings.activeProject;

    if (targetProject) {
      const projectSettings = getProjectSettings(targetProject);
      projectSettings.collections = collections;
      saveProjectSettings(targetProject, projectSettings);
    } else {
      settings.collections = collections;
      writeSettings(settings);
    }

    res.json({ success: true, collections });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save collections',
    });
  }
});

/**
 * @swagger
 * /settings/collections:
 *   post:
 *     summary: Create a collection for active project
 *     tags: [Collections]
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sprint 1
 *               color:
 *                 type: string
 *                 example: '#6366f1'
 *     responses:
 *       200:
 *         description: Collection created
 *       400:
 *         description: Name required
 */
router.post('/collections', (req, res) => {
  try {
    const { name, color } = req.body;
    const projectKey = req.query.project;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }

    const settings = readSettings();
    const targetProject = projectKey || settings.activeProject;

    const newCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color: color || '#6366f1',
    };

    if (targetProject) {
      const projectSettings = getProjectSettings(targetProject);
      const collections = projectSettings.collections || [];
      collections.push(newCollection);
      projectSettings.collections = collections;
      saveProjectSettings(targetProject, projectSettings);
      res.json({ success: true, collection: newCollection, collections });
    } else {
      const collections = settings.collections || [];
      collections.push(newCollection);
      settings.collections = collections;
      writeSettings(settings);
      res.json({ success: true, collection: newCollection, collections });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create collection',
    });
  }
});

/**
 * @swagger
 * /settings/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Project key (uses active project if not specified)
 *     responses:
 *       200:
 *         description: Collection deleted
 *       404:
 *         description: Collection not found
 */
router.delete('/collections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const projectKey = req.query.project;

    const settings = readSettings();
    const targetProject = projectKey || settings.activeProject;

    if (targetProject) {
      const projectSettings = getProjectSettings(targetProject);
      const collections = projectSettings.collections || [];
      const index = collections.findIndex(c => c.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Collection not found' });
      }
      collections.splice(index, 1);
      projectSettings.collections = collections;
      saveProjectSettings(targetProject, projectSettings);
      res.json({ success: true, collections });
    } else {
      const collections = settings.collections || [];
      const index = collections.findIndex(c => c.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Collection not found' });
      }
      collections.splice(index, 1);
      settings.collections = collections;
      writeSettings(settings);
      res.json({ success: true, collections });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete collection',
    });
  }
});

export default router;
