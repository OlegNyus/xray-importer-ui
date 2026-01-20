import express from 'express';
import { configExists, readConfig, writeConfig, CONFIG_PATH } from '../utils/fileOperations.js';

const router = express.Router();

/**
 * @swagger
 * /config:
 *   get:
 *     summary: Get configuration
 *     description: Returns masked API credentials and project settings
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Configuration found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 config:
 *                   $ref: '#/components/schemas/Config'
 *       404:
 *         description: Config not found
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
 * @swagger
 * /config:
 *   post:
 *     summary: Save configuration
 *     description: Save Xray API credentials and project settings
 *     tags: [Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - xrayClientId
 *               - xrayClientSecret
 *               - jiraBaseUrl
 *               - projectKey
 *             properties:
 *               xrayClientId:
 *                 type: string
 *               xrayClientSecret:
 *                 type: string
 *               jiraBaseUrl:
 *                 type: string
 *                 format: uri
 *               projectKey:
 *                 type: string
 *                 pattern: '^[A-Z]+$'
 *     responses:
 *       200:
 *         description: Config saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
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
