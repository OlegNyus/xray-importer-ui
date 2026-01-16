import axios from 'axios';
import { readConfig, writeConfig } from './fileOperations.js';

const XRAY_AUTH_URL = 'https://xray.cloud.getxray.app/api/v2/authenticate';
const XRAY_IMPORT_URL = 'https://xray.cloud.getxray.app/api/v1/import/test/bulk';

const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_REFRESH_BUFFER_MINUTES = 30;

/**
 * Check if a stored token is still valid
 */
function isTokenValid(tokenData) {
  if (!tokenData || !tokenData.timestamp || !tokenData.token) {
    return false;
  }
  const tokenAge = Date.now() - tokenData.timestamp;
  const maxAge = (TOKEN_EXPIRY_HOURS * 60 - TOKEN_REFRESH_BUFFER_MINUTES) * 60 * 1000;
  return tokenAge < maxAge;
}

/**
 * Get authentication token (cached or fresh)
 */
async function getToken(config) {
  // Check for cached valid token
  if (config.tokenData && isTokenValid(config.tokenData)) {
    return config.tokenData.token;
  }

  // Request fresh token
  const response = await axios.post(
    XRAY_AUTH_URL,
    {
      client_id: config.xrayClientId,
      client_secret: config.xrayClientSecret,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  const token = response.data;

  // Cache the token
  config.tokenData = {
    token,
    timestamp: Date.now(),
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
  };
  writeConfig(config);

  return token;
}

/**
 * Convert test cases to Xray bulk import format
 */
function toBulkImportFormat(testCases, projectKey) {
  return testCases.map((tc) => ({
    testtype: tc.testType || 'Manual',
    fields: {
      summary: tc.summary,
      project: { key: projectKey },
      description: tc.description || '',
      labels: tc.labels || [],
    },
    steps: (tc.steps || []).map((step) => ({
      action: step.action || '',
      data: step.data || '',
      result: step.result || '',
    })),
  }));
}

/**
 * Import test cases to Xray Cloud
 * @param {Array} testCases - Array of test case objects
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export async function importToXray(testCases) {
  try {
    const config = readConfig();
    if (!config) {
      return { success: false, error: 'Config not found' };
    }

    // Get authentication token
    let token;
    try {
      token = await getToken(config);
    } catch (authError) {
      const errorMsg = authError.response?.data?.error || authError.message;
      if (errorMsg?.includes('Invalid client credentials')) {
        return { success: false, error: 'Authentication failed: Invalid client credentials' };
      }
      return { success: false, error: `Authentication failed: ${errorMsg}` };
    }

    // Convert to Xray format
    const payload = toBulkImportFormat(testCases, config.projectKey);

    // Make import request
    const response = await axios.post(XRAY_IMPORT_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    if (response.data?.jobId) {
      return {
        success: true,
        jobId: response.data.jobId,
        message: 'Import job created successfully!',
      };
    }

    return {
      success: false,
      error: 'Import completed but no jobId returned',
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    return {
      success: false,
      error: `Import failed: ${errorMsg}`,
    };
  }
}
