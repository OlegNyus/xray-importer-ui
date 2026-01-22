import { useEffect, useCallback } from 'react';
import SearchableMultiSelect from './SearchableMultiSelect';
import FolderInput from './FolderInput';

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
        <SearchableMultiSelect
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
          placeholder="Type to search test plans..."
          emptyMessage="Click Refresh to load test plans"
        />

        <SearchableMultiSelect
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
          placeholder="Type to search test executions..."
          emptyMessage="Click Refresh to load test executions"
        />

        <SearchableMultiSelect
          label="Test Sets"
          values={value.testSetIds || []}
          savedDisplays={value.testSetDisplays || []}
          onChange={(ids, displays) => {
            onChange({ ...value, testSetIds: ids, testSetDisplays: displays });
          }}
          options={cache.testSets}
          loading={cache.loading.testSets}
          error={isRequiredMissing('testSetIds') ? 'At least one required' : cache.errors.testSetIds}
          required
          placeholder="Type to search test sets..."
          emptyMessage="Click Refresh to load test sets"
        />

        <FolderInput
          value={value.folderPath}
          onChange={(v) => onChange({ ...value, folderPath: v })}
          folders={cache.folders}
          loading={cache.loading.folders}
          error={isRequiredMissing('folderPath') ? 'Required' : cache.errors.folders}
          required
        />
      </div>

      <SearchableMultiSelect
        label="Preconditions"
        values={value.preconditionIds || []}
        savedDisplays={value.preconditionDisplays || []}
        onChange={(ids, displays) => {
          onChange({ ...value, preconditionIds: ids, preconditionDisplays: displays });
        }}
        options={cache.preconditions}
        loading={cache.loading.preconditions}
        error={cache.errors.preconditions}
        placeholder="Type to search preconditions..."
        emptyMessage="Click Refresh to load preconditions"
      />

      {/* Hint */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>
          Select Test Plans, Executions, and Sets to link your test case to after import
        </span>
      </div>
    </div>
  );
}

export default XrayLinkingPanel;
