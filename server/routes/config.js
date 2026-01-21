import express from 'express';
import { configExists, readConfig, writeConfig, CONFIG_PATH } from '../utils/fileOperations.js';
import { validateCredentials } from '../utils/xrayClient.js';

const router = express.Router();

/**
 * @swagger
 * /config:
 *   get:
 *     summary: Get configuration
 *     description: Returns Xray API credentials and Jira base URL (no project key - projects are managed separately)
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

    // Return config without projectKey (projects managed separately in settings)
    res.json({
      exists: true,
      config: {
        xrayClientId: config.xrayClientId,
        xrayClientSecret: config.xrayClientSecret,
        jiraBaseUrl: config.jiraBaseUrl,
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
 *     description: Save Xray API credentials and Jira base URL (project keys managed separately)
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
 *             properties:
 *               xrayClientId:
 *                 type: string
 *               xrayClientSecret:
 *                 type: string
 *               jiraBaseUrl:
 *                 type: string
 *                 format: uri
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
router.post('/', async (req, res) => {
  try {
    const { xrayClientId, xrayClientSecret, jiraBaseUrl } = req.body;

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

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Validate credentials against Xray API
    const validationResult = await validateCredentials({
      xrayClientId: xrayClientId.trim(),
      xrayClientSecret: xrayClientSecret.trim(),
    });

    if (!validationResult.success) {
      return res.status(401).json({
        success: false,
        error: validationResult.error || 'Invalid credentials',
      });
    }

    // Save config only if credentials are valid (no projectKey - managed separately)
    const config = {
      xrayClientId: xrayClientId.trim(),
      xrayClientSecret: xrayClientSecret.trim(),
      jiraBaseUrl: jiraBaseUrl.trim(),
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

export default router;
