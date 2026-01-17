const API_BASE = '/api';

/**
 * Helper to handle API responses consistently
 */
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

/**
 * Fetch config from server
 */
export async function fetchConfig() {
  const response = await fetch(`${API_BASE}/config`);
  return handleResponse(response);
}

/**
 * Save config to server
 */
export async function saveConfig(config) {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleResponse(response);
}

/**
 * Fetch all drafts
 */
export async function fetchDrafts() {
  const response = await fetch(`${API_BASE}/drafts`);
  return handleResponse(response);
}

/**
 * Fetch single draft
 */
export async function fetchDraft(id) {
  const response = await fetch(`${API_BASE}/drafts/${id}`);
  return handleResponse(response);
}

/**
 * Create new draft
 */
export async function createDraft(draft) {
  const response = await fetch(`${API_BASE}/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft }),
  });
  return handleResponse(response);
}

/**
 * Update existing draft
 */
export async function updateDraft(id, draft) {
  const response = await fetch(`${API_BASE}/drafts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft }),
  });
  return handleResponse(response);
}

/**
 * Delete draft
 */
export async function deleteDraft(id) {
  const response = await fetch(`${API_BASE}/drafts/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

/**
 * Update draft status
 */
export async function updateDraftStatus(id, status) {
  const response = await fetch(`${API_BASE}/drafts/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
}

/**
 * Import single draft
 */
export async function importDraft(id) {
  const response = await fetch(`${API_BASE}/drafts/${id}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
}

/**
 * Bulk import drafts
 */
export async function bulkImportDrafts(ids) {
  const response = await fetch(`${API_BASE}/drafts/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
}

/**
 * Migrate localStorage data to file system
 */
export async function migrateDrafts(testCases) {
  const response = await fetch(`${API_BASE}/drafts/migrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testCases }),
  });
  return handleResponse(response);
}

/**
 * Get functional areas
 */
export async function fetchFunctionalAreas() {
  const response = await fetch(`${API_BASE}/settings/functional-areas`);
  return handleResponse(response);
}

/**
 * Save functional areas
 */
export async function saveFunctionalAreas(areas) {
  const response = await fetch(`${API_BASE}/settings/functional-areas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ areas }),
  });
  return handleResponse(response);
}

/**
 * Get labels
 */
export async function fetchLabels() {
  const response = await fetch(`${API_BASE}/settings/labels`);
  return handleResponse(response);
}

/**
 * Save labels
 */
export async function saveLabels(labels) {
  const response = await fetch(`${API_BASE}/settings/labels`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  });
  return handleResponse(response);
}
