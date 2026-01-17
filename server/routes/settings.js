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

export default router;
