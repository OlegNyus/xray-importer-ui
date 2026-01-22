import { useState, useEffect } from 'react';
import XrayLinkingPanel from './XrayLinkingPanel';
import { updateTestLinks, updateDraftXrayLinks } from '../utils/api';

// Icons for different link types
const LinkIcons = {
  testPlans: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  testExecutions: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  testSets: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="4" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 2h5a2 2 0 012 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  preconditions: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v4M7 10v2M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  folder: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 4v7a1 1 0 001 1h8a1 1 0 001-1V5a1 1 0 00-1-1H7L5.5 2.5A1 1 0 004.8 2H3a1 1 0 00-1 1v1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
};

function LinkDisplayItem({ label, displays, jiraBaseUrl, icon }) {
  const isEmpty = !displays || displays.length === 0;

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-gray-400 dark:text-gray-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        {isEmpty ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">—</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {displays.map((item) => {
              const key = item.display?.split(':')[0] || item.id;
              return (
                <a
                  key={item.id}
                  href={`${jiraBaseUrl}/browse/${key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-xs border border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.display || key}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-40">
                    <path d="M3 7L7 3M7 3H4M7 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              );
            })}
          </div>
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
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isEditing ? 'Xray Linking' : 'Xray Links'}
        </h3>
        {!isEditing ? (
          <button
            type="button"
            onClick={handleEditClick}
            className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Edit Links
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  Syncing...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v6M6 2L4 4M6 2l2 2M2 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Update in Xray
                  {getChangesSummary() && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                      {getChangesSummary()}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}
      </div>

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
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <LinkDisplayItem
              label="Test Plans"
              displays={xrayLinking.testPlanDisplays}
              jiraBaseUrl={jiraBaseUrl}
              icon={LinkIcons.testPlans}
            />
            <LinkDisplayItem
              label="Test Executions"
              displays={xrayLinking.testExecutionDisplays}
              jiraBaseUrl={jiraBaseUrl}
              icon={LinkIcons.testExecutions}
            />
            <LinkDisplayItem
              label="Test Sets"
              displays={xrayLinking.testSetDisplays}
              jiraBaseUrl={jiraBaseUrl}
              icon={LinkIcons.testSets}
            />
            {/* Folder */}
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-gray-400 dark:text-gray-500">
                {LinkIcons.folder}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Folder</span>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 inline-block">
                  {xrayLinking.folderPath || '/'}
                </p>
              </div>
            </div>
          </div>

          {/* Preconditions - full width */}
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
            <LinkDisplayItem
              label="Preconditions"
              displays={xrayLinking.preconditionDisplays}
              jiraBaseUrl={jiraBaseUrl}
              icon={LinkIcons.preconditions}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default XrayLinksEditor;
