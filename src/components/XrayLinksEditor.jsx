import { useState, useEffect } from 'react';
import XrayLinkingPanel from './XrayLinkingPanel';
import { updateTestLinks, updateDraftXrayLinks } from '../utils/api';

// Icons for different link types
const LinkIcons = {
  testPlans: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  testExecutions: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  testSets: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  preconditions: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  folder: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
};

function LinkTag({ id, display, jiraBaseUrl }) {
  const key = display?.split(':')[0] || id;
  const label = display?.includes(':') ? display.split(':').slice(1).join(':').trim() : null;

  return (
    <a
      href={`${jiraBaseUrl}/browse/${key}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 hover:bg-gray-50 dark:hover:bg-slate-600/50 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all duration-200 cursor-pointer h-10 w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-mono text-sm font-medium text-primary-600 dark:text-purple-400 whitespace-nowrap">
        {key}
      </span>
      {label && (
        <>
          <span className="text-gray-400 dark:text-slate-500">:</span>
          <span className="text-gray-700 dark:text-slate-300 text-sm truncate">{label}</span>
        </>
      )}
    </a>
  );
}

function CategoryTile({ title, icon, items, jiraBaseUrl, isFolder = false }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4 min-w-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-400 dark:text-slate-400">{icon}</span>
        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wide">
          {title}
        </h3>
        {!isFolder && items?.length > 0 && (
          <span className="ml-auto text-xs text-gray-500 dark:text-slate-500 bg-gray-200 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {isFolder ? (
          <div className="flex items-center px-3 py-2 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 h-10 w-full">
            <span className="text-gray-700 dark:text-slate-300 text-sm font-mono truncate">{items}</span>
          </div>
        ) : (
          <>
            {items?.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => (
                  <LinkTag
                    key={item.id}
                    id={item.id}
                    display={item.display}
                    jiraBaseUrl={jiraBaseUrl}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-10 text-gray-400 dark:text-slate-500 text-sm italic">
                No links added
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function XrayLinksEditor({
  testCase,
  activeProject,
  xrayEntitiesCache,
  onLoadXrayEntities,
  onLinksUpdated,
  showToast,
  config,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedLinks, setEditedLinks] = useState(null);
  const [originalLinks, setOriginalLinks] = useState(null);

  const jiraBaseUrl = config?.jiraBaseUrl || 'https://your-domain.atlassian.net';

  // Initialize edited links from testCase when entering edit mode
  useEffect(() => {
    if (isEditing && !editedLinks) {
      const currentLinks = testCase.xrayLinking || {
        testPlanIds: [],
        testPlanDisplays: [],
        testExecutionIds: [],
        testExecutionDisplays: [],
        testSetIds: [],
        testSetDisplays: [],
        folderPath: '/',
        projectId: null,
        preconditionIds: [],
        preconditionDisplays: [],
      };
      setEditedLinks({ ...currentLinks });
      setOriginalLinks({ ...currentLinks });
    }
  }, [isEditing, testCase.xrayLinking, editedLinks]);

  const xrayLinking = testCase.xrayLinking || {};

  const handleEditClick = () => {
    setIsEditing(true);
    // Trigger loading of Xray entities if cache handler is available
    if (onLoadXrayEntities && activeProject) {
      onLoadXrayEntities(activeProject, false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedLinks(null);
    setOriginalLinks(null);
  };

  const computeDiff = (original, current) => {
    const diff = {
      testPlans: { toAdd: [], toRemove: [] },
      testExecutions: { toAdd: [], toRemove: [] },
      testSets: { toAdd: [], toRemove: [] },
      preconditions: { toAdd: [], toRemove: [] },
      folder: { original: original?.folderPath, current: current?.folderPath },
    };

    // Test Plans
    const origTPs = new Set(original?.testPlanIds || []);
    const currTPs = new Set(current?.testPlanIds || []);
    diff.testPlans.toAdd = [...currTPs].filter(id => !origTPs.has(id));
    diff.testPlans.toRemove = [...origTPs].filter(id => !currTPs.has(id));

    // Test Executions
    const origTEs = new Set(original?.testExecutionIds || []);
    const currTEs = new Set(current?.testExecutionIds || []);
    diff.testExecutions.toAdd = [...currTEs].filter(id => !origTEs.has(id));
    diff.testExecutions.toRemove = [...origTEs].filter(id => !currTEs.has(id));

    // Test Sets
    const origTSs = new Set(original?.testSetIds || []);
    const currTSs = new Set(current?.testSetIds || []);
    diff.testSets.toAdd = [...currTSs].filter(id => !origTSs.has(id));
    diff.testSets.toRemove = [...origTSs].filter(id => !currTSs.has(id));

    // Preconditions
    const origPCs = new Set(original?.preconditionIds || []);
    const currPCs = new Set(current?.preconditionIds || []);
    diff.preconditions.toAdd = [...currPCs].filter(id => !origPCs.has(id));
    diff.preconditions.toRemove = [...origPCs].filter(id => !currPCs.has(id));

    return diff;
  };

  const hasChanges = () => {
    if (!editedLinks || !originalLinks) return false;
    const diff = computeDiff(originalLinks, editedLinks);
    return (
      diff.testPlans.toAdd.length > 0 ||
      diff.testPlans.toRemove.length > 0 ||
      diff.testExecutions.toAdd.length > 0 ||
      diff.testExecutions.toRemove.length > 0 ||
      diff.testSets.toAdd.length > 0 ||
      diff.testSets.toRemove.length > 0 ||
      diff.preconditions.toAdd.length > 0 ||
      diff.preconditions.toRemove.length > 0 ||
      (diff.folder.original !== diff.folder.current && diff.folder.current !== '/')
    );
  };

  const handleSave = async () => {
    if (!testCase.testIssueId) {
      showToast?.('Cannot update links: Test issue ID not found');
      return;
    }

    const diff = computeDiff(originalLinks, editedLinks);

    // Check if there are any changes
    if (!hasChanges()) {
      setIsEditing(false);
      setEditedLinks(null);
      setOriginalLinks(null);
      return;
    }

    setSaving(true);

    try {
      // Call the API to update links in Xray
      const result = await updateTestLinks({
        testIssueId: testCase.testIssueId,
        projectKey: activeProject,
        projectId: editedLinks.projectId || xrayEntitiesCache?.projectId,
        diff,
        currentLinks: editedLinks,
      });

      if (result.success) {
        // Update the draft's xrayLinking in the database
        if (testCase.id) {
          await updateDraftXrayLinks(testCase.id, editedLinks);
        }

        showToast?.('Links updated successfully');
        setIsEditing(false);
        setEditedLinks(null);
        setOriginalLinks(null);

        // Notify parent to refresh data
        onLinksUpdated?.();
      } else {
        showToast?.(result.error || 'Failed to update links');
      }
    } catch (error) {
      showToast?.(error.message || 'Failed to update links');
    } finally {
      setSaving(false);
    }
  };

  // Count changes for display
  const getChangesSummary = () => {
    if (!editedLinks || !originalLinks) return null;
    const diff = computeDiff(originalLinks, editedLinks);
    const adds = diff.testPlans.toAdd.length + diff.testExecutions.toAdd.length +
                 diff.testSets.toAdd.length + diff.preconditions.toAdd.length;
    const removes = diff.testPlans.toRemove.length + diff.testExecutions.toRemove.length +
                    diff.testSets.toRemove.length + diff.preconditions.toRemove.length;
    if (adds === 0 && removes === 0) return null;
    const parts = [];
    if (adds > 0) parts.push(`+${adds}`);
    if (removes > 0) parts.push(`-${removes}`);
    return parts.join(' ');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(156 163 175 / 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(156 163 175 / 0.8);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(71 85 105 / 0.5);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(71 85 105 / 0.8);
        }
      `}</style>

      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Xray Links</h2>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={handleEditClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600/50 text-sm font-medium transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Update Links
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-purple-600 dark:to-indigo-600 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Done
                  {getChangesSummary() && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                      {getChangesSummary()}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        {isEditing ? (
          /* Edit Mode - Use XrayLinkingPanel */
          <XrayLinkingPanel
            projectKey={activeProject}
            value={editedLinks || {}}
            onChange={setEditedLinks}
            showValidation={false}
            xrayEntitiesCache={xrayEntitiesCache}
            onLoadXrayEntities={onLoadXrayEntities}
            hideHint
            hideHeader
          />
        ) : (
          /* Read-only Mode - Display current links */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CategoryTile
                title="Test Plans"
                icon={LinkIcons.testPlans}
                items={xrayLinking.testPlanDisplays}
                jiraBaseUrl={jiraBaseUrl}
              />
              <CategoryTile
                title="Test Executions"
                icon={LinkIcons.testExecutions}
                items={xrayLinking.testExecutionDisplays}
                jiraBaseUrl={jiraBaseUrl}
              />
              <CategoryTile
                title="Test Sets"
                icon={LinkIcons.testSets}
                items={xrayLinking.testSetDisplays}
                jiraBaseUrl={jiraBaseUrl}
              />
              <CategoryTile
                title="Folder"
                icon={LinkIcons.folder}
                items={xrayLinking.folderPath || '/'}
                jiraBaseUrl={jiraBaseUrl}
                isFolder
              />
            </div>

            {/* Preconditions - full width */}
            <div className="mt-4">
              <CategoryTile
                title="Preconditions"
                icon={LinkIcons.preconditions}
                items={xrayLinking.preconditionDisplays}
                jiraBaseUrl={jiraBaseUrl}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default XrayLinksEditor;
