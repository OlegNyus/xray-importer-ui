#!/usr/bin/env node

/**
 * Xray Cloud Bulk Import Script (v1 bulk endpoint)
 * Authenticates with Xray Cloud and imports test cases in bulk using the /api/v1/import/test/bulk endpoint.
 * Displays the import jobId for tracking in Xray Cloud UI.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Ajv = require('ajv');

const CONFIG_PATH = path.join(
  __dirname,
  '..',
  'cypress',
  'config',
  'xray-config.json'
);

const greenCheck = '\u2705';
const redCross = '\u274C';
const warn = '\u26A0';

// Token management constants
const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_REFRESH_BUFFER_MINUTES = 30; // Refresh token 30 minutes before expiry

/**
 * Check if a stored token is still valid (not expired)
 * @param {Object} tokenData - Token data with timestamp
 * @returns {boolean} True if token is still valid
 */
function isTokenValid(tokenData) {
  if (!tokenData || !tokenData.timestamp || !tokenData.token) {
    return false;
  }

  const tokenAge = Date.now() - tokenData.timestamp;
  const maxAge =
    (TOKEN_EXPIRY_HOURS * 60 - TOKEN_REFRESH_BUFFER_MINUTES) * 60 * 1000; // Convert to milliseconds

  return tokenAge < maxAge;
}

/**
 * Save token data to config file
 * @param {string} token - Authentication token
 * @param {Object} config - Current config object
 */
function saveTokenToConfig(token, config) {
  const tokenData = {
    token: token,
    timestamp: Date.now(),
    expiresAt: new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString(),
  };

  // Add token data to config
  config.tokenData = tokenData;

  // Save updated config
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Load token data from config if it exists and is valid
 * @param {Object} config - Config object
 * @returns {Object|null} Token data if valid, null otherwise
 */
function loadTokenFromConfig(config) {
  if (!config || !config.tokenData) {
    return null;
  }

  try {
    const tokenData = config.tokenData;
    return isTokenValid(tokenData) ? tokenData : null;
  } catch (error) {
    console.log(`${warn} Error reading token from config: ${error.message}`);
    return null;
  }
}

/**
 * Clean up expired token from config
 * @param {Object} config - Config object
 * @returns {Object} Updated config object
 */
function cleanupExpiredTokenFromConfig(config) {
  if (config && config.tokenData) {
    try {
      if (!isTokenValid(config.tokenData)) {
        console.log(`${warn} Removing expired token from config`);
        delete config.tokenData;
        // Save updated config without expired token
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.log(`${warn} Error processing token in config: ${error.message}`);
      // Remove corrupted token data
      delete config.tokenData;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }
  }
  return config;
}

async function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH))
    throw new Error(`Config file not found: ${CONFIG_PATH}`);
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const required = [
    'xrayClientId',
    'xrayClientSecret',
    'jiraBaseUrl',
    'projectKey',
    'testCaseFile',
  ];
  for (const key of required) {
    if (!config[key]) throw new Error(`Missing required config field: ${key}`);
  }
  return config;
}

/**
 * Get a fresh authentication token from Xray Cloud
 * Tokens expire in 24 hours, so we always request a new one for each script run
 * @param {string} clientId - Xray Cloud Client ID
 * @param {string} clientSecret - Xray Cloud Client Secret
 * @returns {Promise<string>} Fresh authentication token
 */
async function getXrayToken(clientId, clientSecret) {
  const url = 'https://xray.cloud.getxray.app/api/v2/authenticate';
  try {
    console.log('🔄 Requesting fresh authentication token...');
    const response = await axios.post(
      url,
      {
        client_id: clientId,
        client_secret: clientSecret,
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    if (typeof response.data === 'string') {
      console.log('✅ Token obtained.');
      return response.data;
    } else {
      console.error('Unexpected response from Xray:', response.data);
      throw new Error(
        'Unexpected response from Xray Cloud authentication endpoint.'
      );
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(
        'Xray API error response:',
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

function toBulkImportFormat(testCases, projectKey) {
  return testCases.map((tc) => {
    const test = {
      testtype: tc.testType || 'Manual',
      fields: {
        summary: tc.summary,
        project: { key: projectKey },
        description: tc.description || '',
        labels: tc.labels || [],
      },
    };
    if (Array.isArray(tc.steps) && tc.steps.length > 0) {
      test.steps = tc.steps.map((step) => ({
        action: step.action || step.step || '',
        data: step.data || '',
        result: step.result || step.expectedResult || '',
      }));
    }
    return test;
  });
}

async function importTestsBulk(payload, token) {
  const url = 'https://xray.cloud.getxray.app/api/v1/import/test/bulk';
  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

// Add validation functions
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidProjectKey(key) {
  return typeof key === 'string' && key.length > 0 && /^[A-Z]+$/.test(key);
}

function isValidClientId(id) {
  return typeof id === 'string' && id.length > 0;
}

function isValidClientSecret(secret) {
  return typeof secret === 'string' && secret.length > 0;
}

function isValidFilePath(filePath) {
  return typeof filePath === 'string' && filePath.length > 0;
}

async function validateAndFixConfig(config) {
  const requiredFields = [
    {
      key: 'xrayClientId',
      prompt: 'Enter your Xray Cloud Client ID: ',
      validator: isValidClientId,
      errorMsg: 'Client ID cannot be empty',
    },
    {
      key: 'xrayClientSecret',
      prompt: 'Enter your Xray Cloud Client Secret: ',
      validator: isValidClientSecret,
      errorMsg: 'Client Secret cannot be empty',
    },
    {
      key: 'jiraBaseUrl',
      prompt:
        'Enter your Jira Cloud base URL (e.g. https://yourcompany.atlassian.net): ',
      validator: isValidUrl,
      errorMsg:
        'Please enter a valid URL (e.g. https://yourcompany.atlassian.net)',
    },
    {
      key: 'projectKey',
      prompt: 'Enter your Jira project key: ',
      validator: isValidProjectKey,
      errorMsg: 'Project key must be uppercase letters only (e.g. WCP, TEST)',
    },
    {
      key: 'testCaseFile',
      prompt: 'Enter the path to your test case file: ',
      validator: isValidFilePath,
      errorMsg: 'Test case file path cannot be empty',
    },
  ];

  let hasInvalidData = false;
  let updated = false;

  // First pass: check for missing fields
  for (const field of requiredFields) {
    if (!config[field.key]) {
      console.log(`\n${warn} Missing required field: ${field.key}`);
      config[field.key] = await promptUser(field.prompt);
      updated = true;
    }
  }

  // Second pass: validate existing data and request corrections if needed
  for (const field of requiredFields) {
    if (config[field.key] && !field.validator(config[field.key])) {
      console.log(`\n${redCross} Invalid ${field.key}: ${config[field.key]}`);
      console.log(`${warn} ${field.errorMsg}`);
      config[field.key] = await promptUser(field.prompt);
      hasInvalidData = true;
      updated = true;
    }
  }

  // Third pass: if invalid data was found, validate one more time
  if (hasInvalidData) {
    console.log(`\n${warn} Validating corrected data...`);
    for (const field of requiredFields) {
      if (!field.validator(config[field.key])) {
        console.log(`\n${redCross} Invalid ${field.key}: ${config[field.key]}`);
        console.log(`${warn} ${field.errorMsg}`);
        config[field.key] = await promptUser(field.prompt);
        updated = true;
      }
    }
  }

  return { config, updated };
}

async function ensureConfig() {
  let config = {};
  let configWasUpdated = false;

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (error) {
      console.log(`${redCross} Error reading config file: ${error.message}`);
      console.log(`${warn} Creating new config file...`);
      config = {};
    }
  }

  const { config: validatedConfig, updated } =
    await validateAndFixConfig(config);

  if (updated) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(validatedConfig, null, 2));
    console.log(`\n${greenCheck} Config saved to ${CONFIG_PATH}`);

    // Always ensure config is in .gitignore and notify user
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    const ignoreLines = ['cypress/config/xray-config.json'];

    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    let updated = false;
    for (const ignoreLine of ignoreLines) {
      if (
        !gitignoreContent
          .split(/\r?\n/)
          .some((line) => line.trim() === ignoreLine)
      ) {
        gitignoreContent += `\n${ignoreLine}`;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(gitignorePath, gitignoreContent);
    }
    const yellowBg = '\x1b[43m';
    const blackText = '\x1b[30;1m';
    const reset = '\x1b[0m';
    console.log(
      `${yellowBg}${blackText}🔒  This config file is now added to your .gitignore to keep your credentials safe!${reset}`
    );
    configWasUpdated = true;
  }

  return { config: validatedConfig, configWasUpdated };
}

function getTestCaseSchema() {
  return {
    type: 'array',
    items: {
      type: 'object',
      required: ['summary', 'testType', 'steps'],
      properties: {
        summary: { type: 'string' },
        testType: { type: 'string' },
        description: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string' },
              data: { type: 'string' },
              result: { type: 'string' },
              expectedResult: { type: 'string' },
            },
          },
        },
      },
    },
  };
}

async function main() {
  try {
    let { config, configWasUpdated } = await ensureConfig();
    let xrayClientId = config.xrayClientId;
    let xrayClientSecret = config.xrayClientSecret;
    const projectKey = config.projectKey;
    const testCaseFile = config.testCaseFile;

    // Handle test case file not found error
    let testCasesPath = path.isAbsolute(testCaseFile)
      ? testCaseFile
      : path.join(__dirname, '..', testCaseFile);
    let testCases = null;
    let configUpdated = false;

    // Try to load test cases, if file not found, request correct path
    while (!fs.existsSync(testCasesPath)) {
      console.log(`\n${redCross} Test case file not found: ${testCasesPath}`);
      console.log(
        `${warn} Please provide the correct path to your test case file.`
      );
      console.log(`${warn} Available test case files in cypress/testCases/:`);

      // List available test case files
      const testCasesDir = path.join(__dirname, '..', 'cypress', 'testCases');
      if (fs.existsSync(testCasesDir)) {
        const files = fs
          .readdirSync(testCasesDir)
          .filter((file) => file.endsWith('.json'));
        if (files.length > 0) {
          files.forEach((file) => {
            console.log(`  - cypress/testCases/${file}`);
          });
        } else {
          console.log(`  ${warn} No .json files found in cypress/testCases/`);
        }
      } else {
        console.log(`  ${warn} cypress/testCases/ directory not found`);
      }

      const newFilePath = await promptUser(
        'Enter the correct path to your test case file: '
      );
      const newTestCasesPath = path.isAbsolute(newFilePath)
        ? newFilePath
        : path.join(__dirname, '..', newFilePath);

      if (fs.existsSync(newTestCasesPath)) {
        testCasesPath = newTestCasesPath;
        // Update config with correct file path
        config.testCaseFile = newFilePath;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log(`${greenCheck} Config updated with correct file path`);
        configUpdated = true;
        break;
      } else {
        console.log(`${redCross} File still not found: ${newTestCasesPath}`);
        console.log(`${warn} Please check the path and try again.`);
      }
    }

    // Load and validate test cases
    testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));
    const ajv = new Ajv();
    const validate = ajv.compile(getTestCaseSchema());
    process.stdout.write('Validating test case file schema... ');
    if (!validate(testCases)) {
      console.error(`\n${redCross} Test case file schema validation failed:`);
      for (const err of validate.errors) {
        console.error(`- ${err.instancePath} ${err.message}`);
      }
      process.exit(1);
    }
    console.log(`${greenCheck} Valid!`);
    if (!Array.isArray(testCases) || testCases.length === 0)
      throw new Error(`${redCross} No test cases found in file.`);
    console.log(`Found ${testCases.length} test case(s) in file.`);

    console.log('\n🔐 Starting Xray Cloud Authentication...');

    let token;
    let authAttempts = 0;
    const maxAuthAttempts = 2;
    while (authAttempts < maxAuthAttempts) {
      try {
        token = await getXrayToken(xrayClientId, xrayClientSecret);
        console.log('🔑 Token:', token);
        break;
      } catch (authErr) {
        authAttempts++;
        let invalidCreds = false;
        if (
          authErr.response &&
          authErr.response.data &&
          typeof authErr.response.data.error === 'string'
        ) {
          const errMsg = authErr.response.data.error;
          if (errMsg.includes('Invalid client credentials')) {
            invalidCreds = true;
            console.error(
              `\n${redCross} Authentication failed: Invalid client credentials!`
            );
            if (authAttempts < maxAuthAttempts) {
              xrayClientId = await promptUser(
                'Enter your Xray Cloud Client ID: '
              );
              xrayClientSecret = await promptUser(
                'Enter your Xray Cloud Client Secret: '
              );
              config.xrayClientId = xrayClientId;
              config.xrayClientSecret = xrayClientSecret;
              fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
              console.log(
                `${greenCheck} Config updated with new credentials. Retrying authentication...`
              );
              continue;
            }
          }
        }
        // If not invalid creds, or max attempts reached, show error and exit
        if (!invalidCreds || authAttempts >= maxAuthAttempts) {
          console.error(`\n${redCross} Authentication failed!`);
          if (authErr.response && authErr.response.data) {
            console.error(
              'Xray API error response:',
              JSON.stringify(authErr.response.data, null, 2)
            );
          }
          console.error('Error details:', authErr.stack || authErr);
          process.exit(1);
        }
      }
    }
    if (!token) {
      console.error(
        `\n${redCross} Could not authenticate after ${maxAuthAttempts} attempts. Exiting.`
      );
      process.exit(1);
    }
    process.stdout.write('Importing test cases to Xray Cloud... ');
    const bulkPayload = toBulkImportFormat(testCases, projectKey);
    const result = await importTestsBulk(bulkPayload, token);

    if (result && result.jobId) {
      console.log(`\n${greenCheck} Import job created successfully!`);
      console.log(`${greenCheck} Bulk import job submitted to Xray Cloud.`);
      console.log(`\n${greenCheck} Summary:`);
      console.log(
        `  ${greenCheck} ${testCases.length} test case(s) validated and submitted for import`
      );
      console.log(`  ${greenCheck} Test case file: ${testCasesPath}`);
      if (configUpdated) {
        console.log(`  ${greenCheck} Config file updated with correct path`);
      }
      console.log(
        `  ${greenCheck} Import jobId: ${result.jobId} (for tracking in Xray Cloud UI)`
      );
    } else {
      console.log(
        `\n${warn} Import completed but no jobId returned. Response:`,
        result
      );
    }
  } catch (err) {
    console.error(`\n${redCross} Error:`, err.message);
    process.exit(1);
  }
}

main();
