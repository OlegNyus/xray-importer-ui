import { useState, useMemo } from 'react';
import Modal from './Modal';
import { bulkImportDrafts } from '../utils/api';

function SavedTestCases({ testCases, filterStatus, onEdit, onDelete, onImportSuccess, onImportError, onRefresh, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);

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
  }, [testCases, searchQuery, sortOrder, filterStatus]);

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
    // Can select if complete and not already imported
    return tc.isComplete && tc.status !== 'imported';
  }

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
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isImportedView ? 'Imported Test Cases' : 'Draft Test Cases'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isImportedView
              ? 'Test cases that have been imported to Xray'
              : 'Your locally saved test cases'
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {/* Bulk actions - only show on drafts view */}
      {!isImportedView && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg mb-4 animate-slide-down">
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button onClick={deselectAll} className="btn btn-ghost btn-sm">
              Deselect All
            </button>
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
              {/* Checkbox - only show on drafts view */}
              {!isImportedView && (
                <button
                  onClick={() => canSelect(tc) && toggleSelect(tc.id)}
                  disabled={!canSelect(tc)}
                  title={
                    tc.isComplete
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
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {tc.summary || 'Untitled'}
                  </span>
                  {getStatusBadge(tc)}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{tc.testType || 'Manual'}</span>
                  <span>{tc.steps?.length || 0} step{tc.steps?.length !== 1 ? 's' : ''}</span>
                  <span>{formatDate(tc.updatedAt)}</span>
                  {tc.status === 'imported' && tc.importedAt && (
                    <span className="text-blue-500">Imported {formatDate(tc.importedAt)}</span>
                  )}
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
              <div className="flex items-center gap-1">
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
    </div>
  );
}

export default SavedTestCases;
