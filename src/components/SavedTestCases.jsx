import { useState, useMemo } from 'react';
import Modal from './Modal';
import StepProgressBar, { getCompletedSteps, getCurrentStep } from './StepProgressBar';
import { bulkImportDrafts, updateDraft } from '../utils/api';

function SavedTestCases({ testCases, filterStatus, onEdit, onDelete, onImportSuccess, onImportError, onRefresh, showToast, collections = [], onCollectionsChange, config }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [filterCollection, setFilterCollection] = useState('all');
  const [showCollectionMenu, setShowCollectionMenu] = useState(null);

  const isImportedView = filterStatus === 'imported';

  // Filter and sort test cases
  const filteredAndSorted = useMemo(() => {
    let result = [...testCases];

    // Filter by status based on filterStatus prop
    if (filterStatus === 'imported') {
      result = result.filter((tc) => tc.status === 'imported');
    } else {
      result = result.filter((tc) => tc.status !== 'imported');
    }

    // Filter by collection
    if (filterCollection !== 'all') {
      if (filterCollection === 'uncategorized') {
        result = result.filter((tc) => !tc.collectionId);
      } else {
        result = result.filter((tc) => tc.collectionId === filterCollection);
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((tc) =>
        tc.summary?.toLowerCase().includes(query) ||
        tc.description?.toLowerCase().includes(query) ||
        tc.labels?.some((l) => l.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return (a.updatedAt || 0) - (b.updatedAt || 0);
        case 'name':
          return (a.summary || '').localeCompare(b.summary || '');
        case 'status':
          // Order: complete drafts first, then incomplete drafts
          const getOrder = (tc) => {
            if (tc.isComplete) return 0;
            return 1;
          };
          return getOrder(a) - getOrder(b);
        case 'newest':
        default:
          return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
    });

    return result;
  }, [testCases, searchQuery, sortOrder, filterStatus, filterCollection]);

  // Get collection by ID
  function getCollection(collectionId) {
    return collections.find(c => c.id === collectionId);
  }

  // Assign collection to a test case
  async function assignCollection(tcId, collectionId) {
    const tc = testCases.find(t => t.id === tcId);
    if (!tc) return;

    try {
      await updateDraft(tcId, { ...tc, collectionId: collectionId || null });
      onRefresh();
      setShowCollectionMenu(null);
    } catch (error) {
      showToast?.('Failed to update collection');
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function confirmDelete(id) {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  }

  function executeDelete() {
    if (deleteTargetId) {
      onDelete(deleteTargetId);
      selectedIds.delete(deleteTargetId);
      setSelectedIds(new Set(selectedIds));
    }
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  }

  async function executeBulkDelete() {
    for (const id of selectedIds) {
      await onDelete(id);
    }
    setSelectedIds(new Set());
    setShowBulkDeleteModal(false);
  }

  async function handleBulkImport() {
    if (selectedIds.size === 0) return;

    // Only complete, non-imported TCs can be selected
    const selected = testCases.filter((tc) => selectedIds.has(tc.id) && tc.isComplete && tc.status !== 'imported');
    if (selected.length === 0) return;

    setBulkImporting(true);

    try {
      const result = await bulkImportDrafts(selected.map((tc) => tc.id));

      setBulkImporting(false);

      if (result.success) {
        setSelectedIds(new Set());
        onImportSuccess({
          ...result,
          testCasesCount: selected.length,
          draftIds: result.draftIds,
          isBulkImport: true,
        });
      } else {
        onImportError(result);
      }
    } catch (error) {
      setBulkImporting(false);
      onImportError({ success: false, error: error.message || 'Bulk import failed' });
    }
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getStatusBadge(tc) {
    if (tc.status === 'imported') {
      return <span className="badge badge-imported">Imported</span>;
    }
    if (tc.isComplete) {
      return (
        <span className="badge badge-success flex items-center gap-1">
          Draft
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      );
    }
    return <span className="badge badge-draft">Draft</span>;
  }

  function canSelect(tc) {
    // Drafts: can select if complete and not already imported
    // Imported: can always select
    if (isImportedView) {
      return true;
    }
    return tc.isComplete && tc.status !== 'imported';
  }

  function selectAll() {
    const selectableIds = filteredAndSorted
      .filter((tc) => canSelect(tc))
      .map((tc) => tc.id);
    setSelectedIds(new Set(selectableIds));
  }

  const allSelected = filteredAndSorted.length > 0 &&
    filteredAndSorted.filter((tc) => canSelect(tc)).every((tc) => selectedIds.has(tc.id));

  // Check if there are any test cases for this view
  const hasTestCases = testCases.some((tc) =>
    filterStatus === 'imported' ? tc.status === 'imported' : tc.status !== 'imported'
  );

  if (!hasTestCases) {
    return (
      <div className="text-center py-12">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4 text-gray-300 dark:text-gray-600">
          {isImportedView ? (
            <path d="M12 24l8 8 16-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/>
          ) : (
            <>
              <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M18 20h12M18 26h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </>
          )}
        </svg>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          {isImportedView ? 'No imported test cases yet' : 'No saved drafts yet'}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          {isImportedView
            ? 'Test cases will appear here after you import them to Xray'
            : 'Create a test case and click "Save" to store it locally'
          }
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with search/sort */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
        {/* Only show header for drafts - imported view has page header */}
        {!isImportedView && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Draft Test Cases
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Your locally saved test cases
            </p>
          </div>
        )}

        <div className={`flex flex-wrap items-center gap-2 ${isImportedView ? 'w-full' : ''}`}>
          {/* Collection Filter */}
          {collections.length > 0 && (
            <select
              value={filterCollection}
              onChange={(e) => setFilterCollection(e.target.value)}
              className="select w-full sm:w-40"
            >
              <option value="all">All Collections</option>
              <option value="uncategorized">Uncategorized</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="input pl-9 w-full sm:w-36"
            />
          </div>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="select w-full sm:w-32"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">A-Z</option>
            {!isImportedView && <option value="status">Complete</option>}
          </select>
        </div>
      </div>

      {/* Selection header - Select All checkbox */}
      {filteredAndSorted.length > 0 && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => allSelected ? deselectAll() : selectAll()}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
              ${allSelected
                ? 'bg-primary-500 border-primary-500'
                : selectedIds.size > 0
                  ? 'bg-primary-200 border-primary-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
              } cursor-pointer`}
          >
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {!allSelected && selectedIds.size > 0 && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${filteredAndSorted.length} selected`
              : `Select all (${filteredAndSorted.length})`
            }
          </span>
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg mb-4 animate-slide-down">
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button onClick={deselectAll} className="btn btn-ghost btn-sm">
              Deselect All
            </button>
            {!isImportedView && (
              <button
                onClick={handleBulkImport}
                disabled={bulkImporting}
                className="btn btn-primary btn-sm"
              >
                {bulkImporting ? (
                  <>
                    <span className="spinner"></span>
                    Importing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2v8M4 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Import Selected
                  </>
                )}
              </button>
            )}
            {isImportedView && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="btn btn-danger btn-sm"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Test cases list */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No matches found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {searchQuery ? `No test cases match "${searchQuery}"` : 'No test cases to display'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((tc) => (
            <div
              key={tc.id}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors
                ${selectedIds.has(tc.id)
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                  : tc.status === 'imported'
                    ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => canSelect(tc) && toggleSelect(tc.id)}
                disabled={!canSelect(tc)}
                title={
                  isImportedView
                    ? 'Select test case'
                    : tc.isComplete
                      ? 'Select for import'
                      : 'Complete all required fields to import'
                }
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                  ${!canSelect(tc)
                    ? 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-40'
                    : selectedIds.has(tc.id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 cursor-pointer'
                  }`}
              >
                {selectedIds.has(tc.id) && canSelect(tc) && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {tc.summary || 'Untitled'}
                  </span>
                  {getStatusBadge(tc)}
                  {/* Jira testKey badge for imported TCs */}
                  {tc.testKey && (
                    <a
                      href={`${config?.jiraBaseUrl || 'https://your-domain.atlassian.net'}/browse/${tc.testKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tc.testKey}
                    </a>
                  )}
                  {/* Collection badge */}
                  {tc.collectionId && getCollection(tc.collectionId) && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getCollection(tc.collectionId).color }}
                    >
                      {getCollection(tc.collectionId).name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{tc.testType || 'Manual'}</span>
                  <span>{tc.steps?.length || 0} step{tc.steps?.length !== 1 ? 's' : ''}</span>
                  <span>{formatDate(tc.updatedAt)}</span>
                  {tc.status === 'imported' && tc.importedAt && (
                    <span className="text-blue-500">Imported {formatDate(tc.importedAt)}</span>
                  )}
                </div>
                {/* Progress indicator */}
                <div className="mt-2">
                  <StepProgressBar
                    currentStep={getCurrentStep(tc)}
                    completedSteps={getCompletedSteps(tc)}
                    status={tc.status}
                    compact
                  />
                </div>
                {tc.labels?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tc.labels.slice(0, 3).map((label, i) => (
                      <span key={i} className="tag text-xs">{label}</span>
                    ))}
                    {tc.labels.length > 3 && (
                      <span className="tag text-xs">+{tc.labels.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 relative">
                {/* Collection assignment button */}
                {tc.status !== 'imported' && collections.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCollectionMenu(showCollectionMenu === tc.id ? null : tc.id)}
                      className="btn-icon"
                      title="Assign to collection"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h5l2 2h5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {showCollectionMenu === tc.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        <button
                          onClick={() => assignCollection(tc.id, null)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${!tc.collectionId ? 'text-primary-500' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                          Uncategorized
                        </button>
                        {collections.map((col) => (
                          <button
                            key={col.id}
                            onClick={() => assignCollection(tc.id, col.id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${tc.collectionId === col.id ? 'text-primary-500' : 'text-gray-700 dark:text-gray-300'}`}
                          >
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }}></span>
                            {col.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {tc.status !== 'imported' && (
                  <button
                    onClick={() => onEdit(tc.id)}
                    className="btn-icon"
                    title="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                {tc.status === 'imported' && (
                  <button
                    onClick={() => onEdit(tc.id)}
                    className="btn-icon"
                    title="View"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 8c1.5-3 3.5-5 6-5s4.5 2 6 5c-1.5 3-3.5 5-6 5s-4.5-2-6-5z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => confirmDelete(tc.id)}
                  className="btn-icon hover:text-red-500"
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 9h6M10 9v-1.5a1.5 1.5 0 011.5-1.5h1a1.5 1.5 0 011.5 1.5V9M10 9v9a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5V9" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Test Case?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              This will permanently delete the test case from your local storage.
              {testCases.find((tc) => tc.id === deleteTargetId)?.status === 'imported' && (
                <span className="block mt-2 text-blue-500">
                  Note: This will NOT remove it from Xray.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={executeDelete} className="btn btn-danger flex-1">
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <Modal onClose={() => setShowBulkDeleteModal(false)}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 9h6M10 9v-1.5a1.5 1.5 0 011.5-1.5h1a1.5 1.5 0 011.5 1.5V9M10 9v9a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5V9" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete {selectedIds.size} Test Case{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              This will permanently delete the selected test cases from your local storage.
              {isImportedView && (
                <span className="block mt-2 text-blue-500">
                  Note: This will NOT remove them from Xray.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkDeleteModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={executeBulkDelete} className="btn btn-danger flex-1">
                Delete {selectedIds.size} Test Case{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SavedTestCases;
