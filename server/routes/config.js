import express from 'express';
import { configExists, readConfig, writeConfig, CONFIG_PATH } from '../utils/fileOperations.js';

const router = express.Router();

/**
 * GET /api/config
 * Load existing configuration
 */
router.get('/', (req, res) => {
  try {
    if (!configExists()) {
      return res.status(404).json({
        exists: false,
        message: 'Config file not found',
      });
    }

    const config = readConfig();
    if (!config) {
      return res.status(500).json({
        exists: false,
        error: 'Failed to read config file',
      });
    }

    // Don't send full credentials, just masked versions
    res.json({
      exists: true,
      config: {
        xrayClientId: maskValue(config.xrayClientId),
        xrayClientSecret: maskValue(config.xrayClientSecret),
        jiraBaseUrl: config.jiraBaseUrl,
        projectKey: config.projectKey,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load config',
      details: error.message,
    });
  }
});

/**
 * POST /api/config
 * Save configuration
 */
router.post('/', (req, res) => {
  try {
    const { xrayClientId, xrayClientSecret, jiraBaseUrl, projectKey } = req.body;

    // Validation
    const errors = [];

    if (!xrayClientId || typeof xrayClientId !== 'string' || !xrayClientId.trim()) {
      errors.push('xrayClientId is required');
    }

    if (!xrayClientSecret || typeof xrayClientSecret !== 'string' || !xrayClientSecret.trim()) {
      errors.push('xrayClientSecret is required');
    }

    if (!jiraBaseUrl || typeof jiraBaseUrl !== 'string') {
      errors.push('jiraBaseUrl is required');
    } else {
      try {
        new URL(jiraBaseUrl);
      } catch {
        errors.push('jiraBaseUrl must be a valid URL');
      }
    }

    if (!projectKey || typeof projectKey !== 'string' || !/^[A-Z]+$/.test(projectKey)) {
      errors.push('projectKey must be uppercase letters only');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Save config
    const config = {
      xrayClientId: xrayClientId.trim(),
      xrayClientSecret: xrayClientSecret.trim(),
      jiraBaseUrl: jiraBaseUrl.trim(),
      projectKey: projectKey.trim(),
    };

    const configPath = writeConfig(config);

    res.json({
      success: true,
      message: 'Config saved successfully',
      configPath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save config',
      details: error.message,
    });
  }
});

/**
 * Mask sensitive values for display
 */
function maskValue(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
}

export default router;
