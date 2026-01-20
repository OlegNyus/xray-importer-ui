import express from 'express';
import { readSettings, writeSettings } from '../utils/fileOperations.js';

const router = express.Router();

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

/**
 * @swagger
 * /settings/functional-areas:
 *   get:
 *     summary: Get functional areas
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: List of functional areas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 areas:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/functional-areas', (req, res) => {
  try {
    const settings = readSettings();
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
 *     summary: Update functional areas
 *     tags: [Settings]
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
    if (!Array.isArray(areas)) {
      return res.status(400).json({ success: false, error: 'Areas must be an array' });
    }
    const settings = readSettings();
    settings.functionalAreas = areas;
    writeSettings(settings);
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
 *     summary: Get labels
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: List of labels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 labels:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/labels', (req, res) => {
  try {
    const settings = readSettings();
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
 *     summary: Update labels
 *     tags: [Settings]
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
    if (!Array.isArray(labels)) {
      return res.status(400).json({ success: false, error: 'Labels must be an array' });
    }
    const settings = readSettings();
    settings.labels = labels;
    writeSettings(settings);
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
 *     summary: Get collections
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: List of collections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 collections:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Collection'
 */
router.get('/collections', (req, res) => {
  try {
    const settings = readSettings();
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
 *     summary: Update all collections
 *     tags: [Collections]
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
    if (!Array.isArray(collections)) {
      return res.status(400).json({ success: false, error: 'Collections must be an array' });
    }
    const settings = readSettings();
    settings.collections = collections;
    writeSettings(settings);
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
 *     summary: Create a collection
 *     tags: [Collections]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 collection:
 *                   $ref: '#/components/schemas/Collection'
 *       400:
 *         description: Name required
 */
router.post('/collections', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }
    const settings = readSettings();
    const collections = settings.collections || [];

    const newCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color: color || '#6366f1',
    };

    collections.push(newCollection);
    settings.collections = collections;
    writeSettings(settings);

    res.json({ success: true, collection: newCollection, collections });
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
 *     responses:
 *       200:
 *         description: Collection deleted
 *       404:
 *         description: Collection not found
 */
router.delete('/collections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const settings = readSettings();
    const collections = settings.collections || [];

    const index = collections.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }

    collections.splice(index, 1);
    settings.collections = collections;
    writeSettings(settings);

    res.json({ success: true, collections });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete collection',
    });
  }
});

export default router;
