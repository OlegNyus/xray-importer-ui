import express from 'express';
import { readSettings, writeSettings } from '../utils/fileOperations.js';

const router = express.Router();

/**
 * GET /api/settings
 * Get all settings
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
 * PUT /api/settings
 * Update settings
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
 * GET /api/settings/functional-areas
 * Get functional areas
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
 * PUT /api/settings/functional-areas
 * Update functional areas
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
 * GET /api/settings/labels
 * Get labels
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
 * PUT /api/settings/labels
 * Update labels
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
 * GET /api/settings/collections
 * Get collections
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
 * PUT /api/settings/collections
 * Update collections
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
 * POST /api/settings/collections
 * Create a new collection
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
 * DELETE /api/settings/collections/:id
 * Delete a collection
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
