import { useEffect, useCallback } from 'react';

function MultiSelectField({ label, values, onChange, options, loading, error, required, placeholder, savedDisplays }) {
  // Check if a value is selected (handles both issueId and key formats for backwards compatibility)
  const isSelected = (opt) => {
    // Direct match on issueId
    if (values.includes(opt.issueId)) return true;
    // Also check if any value matches the key (for legacy data that stored keys instead of issueIds)
    if (opt.key && values.includes(opt.key)) return true;
    return false;
  };

  // Use Xray internal issueId for GraphQL mutations
  const toggleOption = (opt) => {
    const displayText = `${opt.key}: ${opt.summary}`;
    const currentlySelected = isSelected(opt);

    if (currentlySelected) {
      // Remove - filter out both issueId and key (in case of legacy data)
      onChange(
        values.filter((v) => v !== opt.issueId && v !== opt.key),
        (savedDisplays || []).filter((d) => d.id !== opt.issueId && d.id !== opt.key)
      );
    } else {
      // Add - always use issueId for new selections
      onChange(
        [...values, opt.issueId],
        [...(savedDisplays || []), { id: opt.issueId, display: displayText }]
      );
    }
  };

  // Merge saved displays with loaded options
  const allItems = options.length > 0 ? options : (savedDisplays || []).map(d => ({
    issueId: d.id,
    key: d.display.split(':')[0],
    summary: d.display.split(': ').slice(1).join(': '),
  }));

  const selectedCount = values.length;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {selectedCount > 0 && (
          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
            ({selectedCount} selected)
          </span>
        )}
      </label>
      <div className={`border rounded-lg p-2 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm p-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></span>
            Loading...
          </div>
        ) : allItems.length === 0 ? (
          <p className="text-gray-400 text-sm p-2">{placeholder || 'No items available'}</p>
        ) : (
          allItems.map((opt) => (
            <label
              key={opt.issueId}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isSelected(opt)}
                onChange={() => toggleOption(opt)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {opt.key}: {opt.summary}
              </span>
            </label>
          ))
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function FolderSelect({ value, onChange, folders, loading, error, required }) {
  // Flatten folder tree into a list of paths
  const flattenFolders = (folder, list = []) => {
    if (!folder) return list;
    if (folder.path) {
      list.push(folder.path);
    }
    if (folder.folders && Array.isArray(folder.folders)) {
      folder.folders.forEach((sub) => flattenFolders(sub, list));
    }
    return list;
  };

  const folderPaths = flattenFolders(folders);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Folder {required && <span className="text-red-500">*</span>}
      </label>
      {folderPaths.length > 0 ? (
        <select
          value={value || '/'}
          onChange={(e) => onChange(e.target.value)}
          className={`input ${error ? 'input-error' : ''}`}
          disabled={loading}
        >
          <option value="/">/ (Root)</option>
          {folderPaths.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value || '/'}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/path/to/folder"
          className={`input ${error ? 'input-error' : ''}`}
          disabled={loading}
        />
      )}
      <p className="text-gray-400 text-xs mt-1">
        {folderPaths.length > 0 ? 'Select folder from dropdown' : 'Click "Refresh" to load folders'}
      </p>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function XrayLinkingPanel({ projectKey, value, onChange, showValidation, xrayEntitiesCache, onLoadXrayEntities }) {
  // Use cache if available, otherwise use local state
  const cache = xrayEntitiesCache || {
    testPlans: [],
    testExecutions: [],
    testSets: [],
    preconditions: [],
    folders: null,
    projectId: null,
    loading: {
      testPlans: false,
      testExecutions: false,
      testSets: false,
      preconditions: false,
      folders: false,
    },
    errors: {
      testPlans: null,
      testExecutions: null,
      testSets: null,
      preconditions: null,
      folders: null,
    },
    loaded: false,
  };

  // Auto-load entities on mount if cache is empty
  useEffect(() => {
    if (projectKey && onLoadXrayEntities && !cache.loaded) {
      onLoadXrayEntities(projectKey, false);
    }
  }, [projectKey, onLoadXrayEntities, cache.loaded]);

  // Update projectId in value when cache loads it
  useEffect(() => {
    if (cache.projectId && !value.projectId) {
      onChange({ ...value, projectId: cache.projectId });
    }
  }, [cache.projectId, value, onChange]);

  const handleLoadAll = useCallback(() => {
    if (onLoadXrayEntities && projectKey) {
      onLoadXrayEntities(projectKey, true);
    }
  }, [onLoadXrayEntities, projectKey]);

  const isLoadingAny = cache.loading.testPlans || cache.loading.testExecutions ||
    cache.loading.testSets || cache.loading.preconditions || cache.loading.folders;

  const handleChange = (field, fieldValue, displayField, displayValue) => {
    const updates = { ...value, [field]: fieldValue };
    if (displayField) {
      updates[displayField] = displayValue;
    }
    onChange(updates);
  };

  const isRequiredMissing = (field) => {
    if (!showValidation) return false;
    if (field === 'preconditionIds') return false; // Optional

    // For array fields, check if empty
    if (Array.isArray(value[field])) {
      return value[field].length === 0;
    }
    return !value[field];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Xray Linking
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Required for import
          </span>
          <button
            type="button"
            onClick={handleLoadAll}
            disabled={isLoadingAny}
            className="px-3 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoadingAny ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isLoadingAny ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MultiSelectField
          label="Test Plans"
          values={value.testPlanIds || []}
          savedDisplays={value.testPlanDisplays || []}
          onChange={(ids, displays) => {
            onChange({ ...value, testPlanIds: ids, testPlanDisplays: displays });
          }}
          options={cache.testPlans}
          loading={cache.loading.testPlans}
          error={isRequiredMissing('testPlanIds') ? 'At least one required' : cache.errors.testPlans}
          required
          placeholder="Click Refresh to load options"
        />

        <MultiSelectField
          label="Test Executions"
          values={value.testExecutionIds || []}
          savedDisplays={value.testExecutionDisplays || []}
          onChange={(ids, displays) => {
            onChange({ ...value, testExecutionIds: ids, testExecutionDisplays: displays });
          }}
          options={cache.testExecutions}
          loading={cache.loading.testExecutions}
          error={isRequiredMissing('testExecutionIds') ? 'At least one required' : cache.errors.testExecutions}
          required
          placeholder="Click Refresh to load options"
        />

        <MultiSelectField
          label="Test Sets"
          values={value.testSetIds || []}
          savedDisplays={value.testSetDisplays || []}
          onChange={(ids, displays) => {
            onChange({ ...value, testSetIds: ids, testSetDisplays: displays });
          }}
          options={cache.testSets}
          loading={cache.loading.testSets}
          error={isRequiredMissing('testSetIds') ? 'At least one required' : cache.errors.testSets}
          required
          placeholder="Click Refresh to load options"
        />

        <FolderSelect
          value={value.folderPath}
          onChange={(v) => handleChange('folderPath', v)}
          folders={cache.folders}
          loading={cache.loading.folders}
          error={isRequiredMissing('folderPath') ? 'Required' : cache.errors.folders}
          required
        />
      </div>

      <MultiSelectField
        label="Preconditions"
        values={value.preconditionIds || []}
        savedDisplays={value.preconditionDisplays || []}
        onChange={(ids, displays) => {
          onChange({ ...value, preconditionIds: ids, preconditionDisplays: displays });
        }}
        options={cache.preconditions}
        loading={cache.loading.preconditions}
        error={cache.errors.preconditions}
        placeholder="Click Refresh to load options"
      />
    </div>
  );
}

export default XrayLinkingPanel;
