import { useState, useEffect, useCallback } from 'react';
import TestCaseForm from './TestCaseForm';
import SavedTestCases from './SavedTestCases';
import Modal from './Modal';
import {
  fetchDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
} from '../utils/api';

const STORAGE_KEY = 'raydrop_saved_test_cases';

function TestCaseBuilder({ config, onImportSuccess, onImportError, showToast }) {
  const [activeTab, setActiveTab] = useState('create');
  const [savedTestCases, setSavedTestCases] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load drafts from API
  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchDrafts();
      setSavedTestCases(result.drafts || []);
    } catch (err) {
      console.error('Failed to load drafts:', err);
      setError('Failed to load saved test cases');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Check for localStorage migration on mount
  useEffect(() => {
    const checkMigration = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const oldData = JSON.parse(saved);
          if (Array.isArray(oldData) && oldData.length > 0) {
            // Migration needed - handled by App.jsx
          }
        } catch (e) {
          // Invalid data, can be cleared
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };
    checkMigration();
  }, []);

  const handleSaveDraft = useCallback(async (testCase) => {
    try {
      if (editingId) {
        // Update existing
        const result = await updateDraft(editingId, testCase);
        if (result.success) {
          setSavedTestCases((prev) =>
            prev.map((tc) => (tc.id === editingId ? result.draft : tc))
          );
          showToast('Draft updated');
        } else {
          showToast(result.error || 'Failed to update draft');
        }
      } else {
        // Create new
        const result = await createDraft(testCase);
        if (result.success) {
          setSavedTestCases((prev) => [result.draft, ...prev]);
          setEditingId(result.id);
          showToast('Draft saved');
        } else {
          showToast(result.error || 'Failed to save draft');
        }
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving draft:', err);
      showToast('Failed to save draft');
    }
  }, [editingId, showToast]);

  const handleEdit = useCallback((id) => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'edit', id });
      setShowUnsavedModal(true);
      return;
    }

    setEditingId(id);
    setActiveTab('create');
  }, [hasUnsavedChanges]);

  const handleDelete = useCallback(async (id) => {
    try {
      const result = await deleteDraft(id);
      if (result.success) {
        setSavedTestCases((prev) => prev.filter((tc) => tc.id !== id));
        if (editingId === id) {
          setEditingId(null);
        }
        showToast('Test case deleted');
      } else {
        showToast(result.error || 'Failed to delete test case');
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      showToast('Failed to delete test case');
    }
  }, [editingId, showToast]);

  const handleImportSuccess = useCallback((result, wasEditing) => {
    // Pass the draft ID to the success handler for post-import modal
    onImportSuccess({ ...result, draftId: wasEditing });
  }, [onImportSuccess]);

  const handleCreateNew = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'new' });
      setShowUnsavedModal(true);
      return;
    }

    setEditingId(null);
    setActiveTab('create');
  }, [hasUnsavedChanges]);

  const handleTabChange = useCallback((tab) => {
    // If clicking "Create New" while editing, treat it as "create new"
    if (tab === 'create' && activeTab === 'create' && editingId) {
      handleCreateNew();
      return;
    }

    if (tab === activeTab) return;

    if (hasUnsavedChanges && activeTab === 'create') {
      setPendingAction({ type: 'tab', tab });
      setShowUnsavedModal(true);
      return;
    }

    // Reset editingId when switching to create tab
    if (tab === 'create') {
      setEditingId(null);
    }

    setActiveTab(tab);
  }, [activeTab, hasUnsavedChanges, editingId, handleCreateNew]);

  const handleUnsavedDiscard = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);

    if (pendingAction) {
      if (pendingAction.type === 'tab') {
        setActiveTab(pendingAction.tab);
      } else if (pendingAction.type === 'edit') {
        setEditingId(pendingAction.id);
        setActiveTab('create');
      } else if (pendingAction.type === 'new') {
        setEditingId(null);
        setActiveTab('create');
      }
      setPendingAction(null);
    }
  }, [pendingAction]);

  const handleUnsavedSave = useCallback(async (testCase) => {
    await handleSaveDraft(testCase);
    setShowUnsavedModal(false);

    if (pendingAction) {
      if (pendingAction.type === 'tab') {
        setActiveTab(pendingAction.tab);
      } else if (pendingAction.type === 'edit') {
        setEditingId(pendingAction.id);
        setActiveTab('create');
      } else if (pendingAction.type === 'new') {
        setEditingId(null);
        setActiveTab('create');
      }
      setPendingAction(null);
    }
  }, [pendingAction, handleSaveDraft]);

  const getTestCaseToEdit = useCallback(() => {
    if (!editingId) return null;
    return savedTestCases.find((tc) => tc.id === editingId);
  }, [editingId, savedTestCases]);

  // Refresh drafts after successful import actions
  const refreshDrafts = useCallback(() => {
    loadDrafts();
  }, [loadDrafts]);

  return (
    <div className="card">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange('create')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors
            ${activeTab === 'create'
              ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Create New
        </button>
        <button
          onClick={() => handleTabChange('saved')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors
            ${activeTab === 'saved'
              ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6 3v4h6V3" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Saved
          {savedTestCases.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full">
              {savedTestCases.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {loading && activeTab === 'saved' && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        )}

        {error && activeTab === 'saved' && (
          <div className="text-center py-8">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button onClick={loadDrafts} className="btn btn-secondary">
              Retry
            </button>
          </div>
        )}

        {activeTab === 'create' && (
          <TestCaseForm
            config={config}
            editingTestCase={getTestCaseToEdit()}
            editingId={editingId}
            onSaveDraft={handleSaveDraft}
            onImportSuccess={(result) => handleImportSuccess(result, editingId)}
            onImportError={onImportError}
            onCreateNew={handleCreateNew}
            setHasUnsavedChanges={setHasUnsavedChanges}
            showToast={showToast}
          />
        )}

        {activeTab === 'saved' && !loading && !error && (
          <SavedTestCases
            testCases={savedTestCases}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onImportSuccess={onImportSuccess}
            onImportError={onImportError}
            onRefresh={refreshDrafts}
            showToast={showToast}
          />
        )}
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <UnsavedChangesModal
          onDiscard={handleUnsavedDiscard}
          onCancel={() => {
            setShowUnsavedModal(false);
            setPendingAction(null);
          }}
          onSave={handleUnsavedSave}
        />
      )}
    </div>
  );
}

function UnsavedChangesModal({ onDiscard, onCancel, onSave }) {
  return (
    <Modal onClose={onCancel}>
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17v.5" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unsaved Changes
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You have unsaved changes. Do you want to save as draft before leaving?
        </p>
        <div className="flex gap-3">
          <button onClick={onDiscard} className="btn btn-ghost flex-1">
            Discard
          </button>
          <button onClick={onCancel} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onSave} className="btn btn-primary flex-1">
            Save Draft
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default TestCaseBuilder;
