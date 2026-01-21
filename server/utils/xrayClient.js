import axios from 'axios';
import { readConfig, writeConfig } from './fileOperations.js';

const XRAY_AUTH_URL = 'https://xray.cloud.getxray.app/api/v2/authenticate';
const XRAY_IMPORT_URL = 'https://xray.cloud.getxray.app/api/v1/import/test/bulk';
const XRAY_JOB_STATUS_URL = 'https://xray.cloud.getxray.app/api/v1/import/test/bulk';
const XRAY_GRAPHQL_URL = 'https://xray.cloud.getxray.app/api/v2/graphql';

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
 * Validate Xray credentials by attempting to authenticate
 * @param {Object} credentials - {xrayClientId, xrayClientSecret}
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function validateCredentials(credentials) {
  try {
    const response = await axios.post(
      XRAY_AUTH_URL,
      {
        client_id: credentials.xrayClientId,
        client_secret: credentials.xrayClientSecret,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    // If we got a token, credentials are valid
    if (response.data) {
      return { success: true };
    }

    return { success: false, error: 'Authentication failed: No token received' };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg?.includes('Invalid client credentials')) {
      return { success: false, error: 'Invalid Client ID or Client Secret' };
    }
    return { success: false, error: `Authentication failed: ${errorMsg}` };
  }
}

/**
 * Import test cases to Xray Cloud
 * @param {Array} testCases - Array of test case objects with projectKey
 * @param {string} projectKey - Project key to import to (optional, uses first test case's projectKey or config default)
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export async function importToXray(testCases, projectKey = null) {
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

    // Use provided projectKey, or from first test case, or from config
    const targetProject = projectKey || testCases[0]?.projectKey || config.projectKey;
    if (!targetProject) {
      return { success: false, error: 'No project key specified' };
    }

    // Convert to Xray format
    const payload = toBulkImportFormat(testCases, targetProject);

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

/**
 * Poll for bulk import job status
 * @param {string} jobId - The job ID from the bulk import
 * @param {number} maxAttempts - Maximum polling attempts (default: 30)
 * @param {number} intervalMs - Polling interval in ms (default: 2000)
 * @returns {Promise<{success: boolean, testIssueIds?: string[], error?: string}>}
 */
export async function getJobStatus(jobId, maxAttempts = 30, intervalMs = 2000) {
  const config = readConfig();
  if (!config) {
    return { success: false, error: 'Config not found' };
  }

  const token = await getToken(config);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(`${XRAY_JOB_STATUS_URL}/${jobId}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const { status, result } = response.data;

      if (status === 'successful') {
        // Extract test issue IDs from result - Xray returns "issues" array, not "createdIssues"
        const issues = result?.issues || result?.createdIssues || [];
        const testIssueIds = issues.map((issue) => issue.id) || [];
        const testKeys = issues.map((issue) => issue.key) || [];
        return {
          success: true,
          status: 'successful',
          testIssueIds,
          testKeys,
        };
      }

      if (status === 'failed') {
        // Try to extract detailed error message from Xray response
        const errorMessage = result?.error ||
          result?.message ||
          result?.errors?.join(', ') ||
          (typeof result === 'string' ? result : JSON.stringify(result)) ||
          'Import job failed';
        console.error('Xray import job failed:', response.data);
        return {
          success: false,
          status: 'failed',
          error: errorMessage,
          details: result,
        };
      }

      // Status is 'working' or 'pending', wait and retry
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      return {
        success: false,
        error: `Failed to get job status: ${error.message}`,
      };
    }
  }

  return {
    success: false,
    error: 'Job status polling timed out',
  };
}

/**
 * Import test cases and wait for completion
 * @param {Array} testCases - Array of test case objects
 * @param {string} projectKey - Project key to import to (optional)
 * @returns {Promise<{success: boolean, testIssueIds?: string[], error?: string}>}
 */
export async function importToXrayAndWait(testCases, projectKey = null) {
  const importResult = await importToXray(testCases, projectKey);

  if (!importResult.success) {
    return importResult;
  }

  // Poll for job completion
  const jobResult = await getJobStatus(importResult.jobId);

  if (!jobResult.success) {
    return {
      success: false,
      jobId: importResult.jobId,
      error: jobResult.error,
    };
  }

  return {
    success: true,
    jobId: importResult.jobId,
    testIssueIds: jobResult.testIssueIds,
    testKeys: jobResult.testKeys,
  };
}

/**
 * Execute a GraphQL query/mutation against Xray Cloud
 * @param {string} query - GraphQL query or mutation
 * @param {Object} variables - Variables for the query
 * @returns {Promise<Object>} - GraphQL response data
 */
async function executeGraphQL(query, variables = {}) {
  const config = readConfig();
  if (!config) {
    throw new Error('Config not found');
  }

  const token = await getToken(config);

  const response = await axios.post(
    XRAY_GRAPHQL_URL,
    { query, variables },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || 'GraphQL error');
  }

  return response.data.data;
}

/**
 * Get Test Plans for a project
 * @param {string} projectKey - Jira project key
 * @returns {Promise<Array>} - List of test plans
 */
export async function getTestPlans(projectKey) {
  const query = `
    query GetTestPlans($jql: String!, $limit: Int!) {
      getTestPlans(jql: $jql, limit: $limit) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
    }
  `;

  const data = await executeGraphQL(query, {
    jql: `project = '${projectKey}'`,
    limit: 100,
  });

  return data.getTestPlans.results.map((tp) => ({
    issueId: tp.issueId,
    key: tp.jira?.key,
    summary: tp.jira?.summary,
  }));
}

/**
 * Get Test Executions for a project
 * @param {string} projectKey - Jira project key
 * @returns {Promise<Array>} - List of test executions
 */
export async function getTestExecutions(projectKey) {
  const query = `
    query GetTestExecutions($jql: String!, $limit: Int!) {
      getTestExecutions(jql: $jql, limit: $limit) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
    }
  `;

  const data = await executeGraphQL(query, {
    jql: `project = '${projectKey}'`,
    limit: 100,
  });

  return data.getTestExecutions.results.map((te) => ({
    issueId: te.issueId,
    key: te.jira?.key,
    summary: te.jira?.summary,
  }));
}

/**
 * Get Test Sets for a project
 * @param {string} projectKey - Jira project key
 * @returns {Promise<Array>} - List of test sets
 */
export async function getTestSets(projectKey) {
  const query = `
    query GetTestSets($jql: String!, $limit: Int!) {
      getTestSets(jql: $jql, limit: $limit) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
    }
  `;

  const data = await executeGraphQL(query, {
    jql: `project = '${projectKey}'`,
    limit: 100,
  });

  return data.getTestSets.results.map((ts) => ({
    issueId: ts.issueId,
    key: ts.jira?.key,
    summary: ts.jira?.summary,
  }));
}

/**
 * Get Preconditions for a project
 * @param {string} projectKey - Jira project key
 * @returns {Promise<Array>} - List of preconditions
 */
export async function getPreconditions(projectKey) {
  const query = `
    query GetPreconditions($jql: String!, $limit: Int!) {
      getPreconditions(jql: $jql, limit: $limit) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
    }
  `;

  const data = await executeGraphQL(query, {
    jql: `project = '${projectKey}'`,
    limit: 100,
  });

  return data.getPreconditions.results.map((pc) => ({
    issueId: pc.issueId,
    key: pc.jira?.key,
    summary: pc.jira?.summary,
  }));
}

/**
 * Get folder structure from Test Repository
 * @param {string} projectId - Jira project ID
 * @param {string} path - Folder path (default: root)
 * @returns {Promise<Object>} - Folder structure
 */
export async function getFolders(projectId, path = '/') {
  const query = `
    query GetFolder($projectId: String!, $path: String!) {
      getFolder(projectId: $projectId, path: $path) {
        name
        path
        testsCount
        folders
      }
    }
  `;

  const data = await executeGraphQL(query, { projectId, path });
  return data.getFolder;
}

/**
 * Get project ID from project key using Xray GraphQL API
 * Uses getProjectSettings which accepts projectIdOrKey
 * @param {string} projectKey - Jira project key
 * @returns {Promise<string>} - Project ID
 */
export async function getProjectId(projectKey) {
  const query = `
    query GetProjectSettings($projectIdOrKey: String!) {
      getProjectSettings(projectIdOrKey: $projectIdOrKey) {
        projectId
      }
    }
  `;

  const data = await executeGraphQL(query, { projectIdOrKey: projectKey });

  if (data.getProjectSettings?.projectId) {
    return data.getProjectSettings.projectId;
  }

  throw new Error(`Could not resolve project ID for ${projectKey}`);
}

/**
 * Add tests to a Test Plan
 * @param {string} testPlanId - Test Plan issue ID
 * @param {Array<string>} testIssueIds - Array of test issue IDs
 */
export async function addTestsToTestPlan(testPlanId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestPlan($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testPlanId,
    testIssueIds,
  });

  return data.addTestsToTestPlan;
}

/**
 * Add tests to a Test Execution
 * @param {string} testExecutionId - Test Execution issue ID
 * @param {Array<string>} testIssueIds - Array of test issue IDs
 */
export async function addTestsToTestExecution(testExecutionId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestExecution($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestExecution(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testExecutionId,
    testIssueIds,
  });

  return data.addTestsToTestExecution;
}

/**
 * Add tests to a Test Set
 * @param {string} testSetId - Test Set issue ID
 * @param {Array<string>} testIssueIds - Array of test issue IDs
 */
export async function addTestsToTestSet(testSetId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestSet($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testSetId,
    testIssueIds,
  });

  return data.addTestsToTestSet;
}

/**
 * Add tests to a folder in Test Repository
 * @param {string} projectId - Project ID
 * @param {string} folderPath - Folder path
 * @param {Array<string>} testIssueIds - Array of test issue IDs
 */
export async function addTestsToFolder(projectId, folderPath, testIssueIds) {
  const mutation = `
    mutation AddTestsToFolder($projectId: String!, $path: String!, $testIssueIds: [String]!) {
      addTestsToFolder(projectId: $projectId, path: $path, testIssueIds: $testIssueIds) {
        folder {
          name
          path
          testsCount
        }
        warnings
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    projectId,
    path: folderPath,
    testIssueIds,
  });

  return data.addTestsToFolder;
}

/**
 * Add preconditions to a test
 * @param {string} testIssueId - Test issue ID
 * @param {Array<string>} preconditionIssueIds - Array of precondition issue IDs
 */
export async function addPreconditionsToTest(testIssueId, preconditionIssueIds) {
  const mutation = `
    mutation AddPreconditionsToTest($issueId: String!, $preconditionIssueIds: [String]!) {
      addPreconditionsToTest(issueId: $issueId, preconditionIssueIds: $preconditionIssueIds) {
        addedPreconditions
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testIssueId,
    preconditionIssueIds,
  });

  return data.addPreconditionsToTest;
}

/**
 * Remove tests from a Test Plan
 * @param {string} testPlanId - Test Plan issue ID
 * @param {Array<string>} testIssueIds - Array of test issue IDs to remove
 */
export async function removeTestsFromTestPlan(testPlanId, testIssueIds) {
  const mutation = `
    mutation RemoveTestsFromTestPlan($issueId: String!, $testIssueIds: [String]!) {
      removeTestsFromTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
        removedTests
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testPlanId,
    testIssueIds,
  });

  return data.removeTestsFromTestPlan;
}

/**
 * Remove tests from a Test Execution
 * @param {string} testExecutionId - Test Execution issue ID
 * @param {Array<string>} testIssueIds - Array of test issue IDs to remove
 */
export async function removeTestsFromTestExecution(testExecutionId, testIssueIds) {
  const mutation = `
    mutation RemoveTestsFromTestExecution($issueId: String!, $testIssueIds: [String]!) {
      removeTestsFromTestExecution(issueId: $issueId, testIssueIds: $testIssueIds) {
        removedTests
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testExecutionId,
    testIssueIds,
  });

  return data.removeTestsFromTestExecution;
}

/**
 * Remove tests from a Test Set
 * @param {string} testSetId - Test Set issue ID
 * @param {Array<string>} testIssueIds - Array of test issue IDs to remove
 */
export async function removeTestsFromTestSet(testSetId, testIssueIds) {
  const mutation = `
    mutation RemoveTestsFromTestSet($issueId: String!, $testIssueIds: [String]!) {
      removeTestsFromTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
        removedTests
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testSetId,
    testIssueIds,
  });

  return data.removeTestsFromTestSet;
}

/**
 * Remove tests from a folder in Test Repository
 * @param {string} projectId - Project ID
 * @param {string} folderPath - Folder path
 * @param {Array<string>} testIssueIds - Array of test issue IDs to remove
 */
export async function removeTestsFromFolder(projectId, folderPath, testIssueIds) {
  const mutation = `
    mutation RemoveTestsFromFolder($projectId: String!, $path: String!, $testIssueIds: [String]!) {
      removeTestsFromFolder(projectId: $projectId, path: $path, testIssueIds: $testIssueIds) {
        folder {
          name
          path
          testsCount
        }
        warnings
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    projectId,
    path: folderPath,
    testIssueIds,
  });

  return data.removeTestsFromFolder;
}

/**
 * Remove preconditions from a test
 * @param {string} testIssueId - Test issue ID
 * @param {Array<string>} preconditionIssueIds - Array of precondition issue IDs to remove
 */
export async function removePreconditionsFromTest(testIssueId, preconditionIssueIds) {
  const mutation = `
    mutation RemovePreconditionsFromTest($issueId: String!, $preconditionIssueIds: [String]!) {
      removePreconditionsFromTest(issueId: $issueId, preconditionIssueIds: $preconditionIssueIds) {
        removedPreconditions
        warning
      }
    }
  `;

  const data = await executeGraphQL(mutation, {
    issueId: testIssueId,
    preconditionIssueIds,
  });

  return data.removePreconditionsFromTest;
}
