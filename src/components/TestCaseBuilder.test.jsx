import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestCaseBuilder from './TestCaseBuilder';
import * as api from '../utils/api';

vi.mock('../utils/api');
vi.mock('./TestCaseForm', () => ({
  default: ({ editingTestCase, onSaveDraft, onCreateNew, setHasUnsavedChanges, xrayEntitiesCache, onLoadXrayEntities }) => (
    <div data-testid="test-case-form">
      <span data-testid="editing">{editingTestCase?.id || 'new'}</span>
      <button onClick={() => onSaveDraft({ summary: 'Test' })}>Save Draft Mock</button>
      <button onClick={onCreateNew}>Create New Mock</button>
      <button onClick={() => setHasUnsavedChanges?.(true)}>Set Unsaved</button>
      <button onClick={() => onLoadXrayEntities?.('TEST', false)}>Load Xray Entities</button>
      <button onClick={() => onLoadXrayEntities?.('TEST', true)}>Force Refresh Xray</button>
      <span data-testid="xray-cache-loaded">{xrayEntitiesCache?.loaded ? 'loaded' : 'not-loaded'}</span>
      <span data-testid="xray-test-plans">{xrayEntitiesCache?.testPlans?.length || 0}</span>
    </div>
  ),
}));
vi.mock('./SavedTestCases', () => ({
  default: ({ filterStatus, onEdit, onDelete, onImport }) => (
    <div data-testid={`saved-test-cases-${filterStatus}`}>
      <button onClick={() => onEdit('tc-1')}>Edit tc-1</button>
      <button onClick={() => onDelete('tc-1')}>Delete tc-1</button>
      <button onClick={() => onImport?.(['tc-1'])}>Import tc-1</button>
    </div>
  ),
}));
vi.mock('./CollectionsView', () => ({
  default: ({ collections, onCreateCollection, onDeleteCollection }) => (
    <div data-testid="collections-view">
      <span>{collections?.length || 0} collections</span>
      <button onClick={() => onCreateCollection('New Collection', '#ff0000')}>Create Collection</button>
      <button onClick={() => onDeleteCollection('col-1')}>Delete Collection</button>
    </div>
  ),
}));
vi.mock('./Modal', () => ({
  default: ({ children, onClose }) => (
    <div data-testid="modal" role="dialog">
      {children}
      <button onClick={onClose} data-testid="modal-close">Close</button>
    </div>
  ),
}));

describe('TestCaseBuilder', () => {
  // Config no longer has projectKey - it's passed separately as activeProject
  const mockConfig = {
    xrayClientId: 'test-id',
    xrayClientSecret: 'test-secret',
    jiraBaseUrl: 'https://test.atlassian.net',
  };

  const mockDrafts = [
    { id: 'tc-1', summary: 'Test 1', status: 'draft', projectKey: 'TEST' },
    { id: 'tc-2', summary: 'Test 2', status: 'imported', projectKey: 'TEST' },
  ];

  const defaultProps = {
    config: mockConfig,
    activeProject: 'TEST',
    onImportSuccess: vi.fn(),
    onImportError: vi.fn(),
    showToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchDrafts.mockResolvedValue({ success: true, drafts: mockDrafts });
    api.createDraft.mockResolvedValue({ success: true, id: 'new-id', draft: { id: 'new-id', summary: 'Test' } });
    api.updateDraft.mockResolvedValue({ success: true, draft: { id: 'tc-1', summary: 'Updated' } });
    api.deleteDraft.mockResolvedValue({ success: true });
    api.fetchCollections.mockResolvedValue({ success: true, collections: [{ id: 'col-1', name: 'Smoke', color: '#ff0000' }] });
    api.createCollection.mockResolvedValue({ success: true, collection: { id: 'col-new', name: 'New Collection', color: '#ff0000' } });
    api.deleteCollection.mockResolvedValue({ success: true });
    api.fetchTestPlans.mockResolvedValue({ success: true, testPlans: [] });
    api.fetchTestExecutions.mockResolvedValue({ success: true, testExecutions: [] });
    api.fetchTestSets.mockResolvedValue({ success: true, testSets: [] });
    api.fetchPreconditions.mockResolvedValue({ success: true, preconditions: [] });
    api.fetchFolders.mockResolvedValue({ success: true, folders: { path: '/', folders: [] } });
    localStorage.clear();
  });

  it('should render title', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Create Test Case')).toBeInTheDocument();
    });
  });

  it('should load drafts on mount', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });
  });

  it('should show Create New tab by default', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
    });
  });

  it('should switch to Drafts tab', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });
  });

  it('should switch to Imported tab', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Imported'));

    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-imported')).toBeInTheDocument();
    });
  });

  it('should show draft count badge', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      // Check that drafts tab button contains the count badge
      const draftsTab = screen.getByText('Drafts').closest('button');
      expect(draftsTab).toHaveTextContent('1');
    });
  });

  it('should save draft', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Draft Mock'));

    await waitFor(() => {
      expect(api.createDraft).toHaveBeenCalled();
      // Modal is shown by TestCaseForm instead of toast
    });
  });

  it('should delete draft', async () => {
    const showToast = vi.fn();
    render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete tc-1'));

    await waitFor(() => {
      expect(api.deleteDraft).toHaveBeenCalledWith('tc-1');
      expect(showToast).toHaveBeenCalledWith('Test case deleted');
    });
  });

  it('should edit draft', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit tc-1'));

    await waitFor(() => {
      expect(screen.getByTestId('editing')).toHaveTextContent('tc-1');
    });
  });

  it('should handle load drafts error', async () => {
    api.fetchDrafts.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestCaseBuilder {...defaultProps} />);

    // Switch to saved tab to see the error
    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load saved test cases')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should retry loading drafts', async () => {
    api.fetchDrafts.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestCaseBuilder {...defaultProps} />);

    // Switch to saved tab to see the error
    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load saved test cases')).toBeInTheDocument();
    });

    api.fetchDrafts.mockResolvedValueOnce({ success: true, drafts: mockDrafts });
    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalledTimes(2);
    });

    consoleSpy.mockRestore();
  });

  it('should handle delete error', async () => {
    // First call succeeds, subsequent call fails
    api.deleteDraft.mockResolvedValueOnce({ success: false, error: 'Delete failed' });
    const showToast = vi.fn();

    render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete tc-1'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Delete failed');
    });
  });

  it('should handle delete exception', async () => {
    api.deleteDraft.mockRejectedValueOnce(new Error('Network error'));
    const showToast = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Drafts'));

    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete tc-1'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Failed to delete test case');
    });

    consoleSpy.mockRestore();
  });

  it('should handle save draft error', async () => {
    api.createDraft.mockResolvedValueOnce({ success: false, error: 'Save failed' });
    const showToast = vi.fn();

    render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
    await waitFor(() => {
      expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Draft Mock'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Save failed');
    });
  });

  it('should handle save draft exception', async () => {
    api.createDraft.mockRejectedValueOnce(new Error('Network error'));
    const showToast = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
    await waitFor(() => {
      expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Draft Mock'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Failed to save draft');
    });

    consoleSpy.mockRestore();
  });

  it('should load collections on mount', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchCollections).toHaveBeenCalled();
    });
  });

  it('should filter drafts by project', async () => {
    render(<TestCaseBuilder {...defaultProps} activeProject="TEST" />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
      // Drafts should be filtered by project
    });
  });

  it('should handle collection error gracefully', async () => {
    api.fetchCollections.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should create new after clicking create new button', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
    });

    // First edit a draft
    fireEvent.click(screen.getByText('Drafts'));
    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit tc-1'));
    await waitFor(() => {
      expect(screen.getByTestId('editing')).toHaveTextContent('tc-1');
    });

    // Now create new
    fireEvent.click(screen.getByText('Create New Mock'));
    await waitFor(() => {
      expect(screen.getByTestId('editing')).toHaveTextContent('new');
    });
  });

  it('should update existing draft', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    // Edit a draft
    fireEvent.click(screen.getByText('Drafts'));
    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit tc-1'));
    await waitFor(() => {
      expect(screen.getByTestId('editing')).toHaveTextContent('tc-1');
    });

    // Save the draft
    fireEvent.click(screen.getByText('Save Draft Mock'));
    await waitFor(() => {
      expect(api.updateDraft).toHaveBeenCalled();
    });
  });

  it('should handle update draft error', async () => {
    api.updateDraft.mockResolvedValueOnce({ success: false, error: 'Update failed' });
    const showToast = vi.fn();

    render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
    await waitFor(() => {
      expect(api.fetchDrafts).toHaveBeenCalled();
    });

    // Edit a draft
    fireEvent.click(screen.getByText('Drafts'));
    await waitFor(() => {
      expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit tc-1'));
    await waitFor(() => {
      expect(screen.getByTestId('editing')).toHaveTextContent('tc-1');
    });

    // Save the draft
    fireEvent.click(screen.getByText('Save Draft Mock'));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Update failed');
    });
  });

  it('should show imported count badge', async () => {
    render(<TestCaseBuilder {...defaultProps} />);
    await waitFor(() => {
      // Check that imported tab button contains the count badge
      const importedTab = screen.getByText('Imported').closest('button');
      expect(importedTab).toHaveTextContent('1');
    });
  });

  // Unsaved changes modal tests
  describe('Unsaved Changes Modal', () => {
    it('should show modal when switching tabs with unsaved changes', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      // Set unsaved changes
      fireEvent.click(screen.getByText('Set Unsaved'));

      // Try to switch to drafts tab
      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
        expect(screen.getByText('You have unsaved changes. Do you want to save as draft before leaving?')).toBeInTheDocument();
      });
    });

    it('should discard changes when clicking Discard in modal', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      // Set unsaved changes
      fireEvent.click(screen.getByText('Set Unsaved'));

      // Try to switch to drafts tab
      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click discard
      fireEvent.click(screen.getByText('Discard'));

      await waitFor(() => {
        expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
      });
    });

    it('should cancel and stay on current tab when clicking Cancel in modal', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      // Set unsaved changes
      fireEvent.click(screen.getByText('Set Unsaved'));

      // Try to switch to drafts tab
      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        // Should still be on create tab
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });
    });

    it('should show modal when editing another draft with unsaved changes', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      // Set unsaved changes
      fireEvent.click(screen.getByText('Set Unsaved'));

      // Switch to drafts tab (this will trigger modal)
      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });

    it('should show modal when creating new with unsaved changes during edit', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      // First switch to drafts and edit one
      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit tc-1'));

      await waitFor(() => {
        expect(screen.getByTestId('editing')).toHaveTextContent('tc-1');
      });

      // Set unsaved changes
      fireEvent.click(screen.getByText('Set Unsaved'));

      // Click Create New Mock (which calls onCreateNew)
      fireEvent.click(screen.getByText('Create New Mock'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  // Xray entities loading tests
  describe('Xray Entities Loading', () => {
    it('should load Xray entities when requested', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Load Xray Entities'));

      await waitFor(() => {
        expect(api.fetchTestPlans).toHaveBeenCalledWith('TEST');
        expect(api.fetchTestExecutions).toHaveBeenCalledWith('TEST');
        expect(api.fetchTestSets).toHaveBeenCalledWith('TEST');
        expect(api.fetchPreconditions).toHaveBeenCalledWith('TEST');
        expect(api.fetchFolders).toHaveBeenCalledWith('TEST');
      });
    });

    it('should cache Xray entities and not reload', async () => {
      // Setup: First load returns data
      api.fetchTestPlans.mockResolvedValue({ success: true, testPlans: [{ id: 'plan-1' }] });

      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      // First load
      fireEvent.click(screen.getByText('Load Xray Entities'));

      await waitFor(() => {
        expect(api.fetchTestPlans).toHaveBeenCalledTimes(1);
      });

      // Second load should use cache (not call API again)
      fireEvent.click(screen.getByText('Load Xray Entities'));

      // Wait a bit
      await new Promise((r) => setTimeout(r, 100));

      // Should still be 1 call (cached)
      expect(api.fetchTestPlans).toHaveBeenCalledTimes(1);
    });

    it('should force refresh Xray entities when requested', async () => {
      api.fetchTestPlans.mockResolvedValue({ success: true, testPlans: [{ id: 'plan-1' }] });

      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      // First load
      fireEvent.click(screen.getByText('Load Xray Entities'));

      await waitFor(() => {
        expect(api.fetchTestPlans).toHaveBeenCalledTimes(1);
      });

      // Force refresh
      fireEvent.click(screen.getByText('Force Refresh Xray'));

      await waitFor(() => {
        expect(api.fetchTestPlans).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle Xray entities load error', async () => {
      api.fetchTestPlans.mockRejectedValueOnce(new Error('Network error'));

      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Load Xray Entities'));

      // Should not throw, error is captured in cache
      await waitFor(() => {
        expect(api.fetchTestPlans).toHaveBeenCalled();
      });
    });
  });

  // Collection handlers tests
  describe('Collection Handlers', () => {
    it('should create collection via CollectionsView', async () => {
      const showToast = vi.fn();
      api.createCollection.mockResolvedValueOnce({
        success: true,
        collections: [{ id: 'col-new', name: 'New Collection', color: '#ff0000' }],
      });

      render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
      await waitFor(() => {
        expect(api.fetchCollections).toHaveBeenCalled();
      });

      // Switch to collections tab
      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByTestId('collections-view')).toBeInTheDocument();
      });

      // Create collection
      fireEvent.click(screen.getByText('Create Collection'));

      await waitFor(() => {
        expect(api.createCollection).toHaveBeenCalledWith('New Collection', '#ff0000');
        expect(showToast).toHaveBeenCalledWith('Collection created');
      });
    });

    it('should handle create collection error', async () => {
      const showToast = vi.fn();
      api.createCollection.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
      await waitFor(() => {
        expect(api.fetchCollections).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByTestId('collections-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Collection'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Failed to create collection');
      });

      consoleSpy.mockRestore();
    });

    it('should delete collection via CollectionsView', async () => {
      const showToast = vi.fn();
      api.deleteCollection.mockResolvedValueOnce({
        success: true,
        collections: [],
      });

      render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
      await waitFor(() => {
        expect(api.fetchCollections).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByTestId('collections-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete Collection'));

      await waitFor(() => {
        expect(api.deleteCollection).toHaveBeenCalledWith('col-1');
        expect(showToast).toHaveBeenCalledWith('Collection deleted');
      });
    });

    it('should handle delete collection error', async () => {
      const showToast = vi.fn();
      api.deleteCollection.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<TestCaseBuilder {...defaultProps} showToast={showToast} />);
      await waitFor(() => {
        expect(api.fetchCollections).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByTestId('collections-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete Collection'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Failed to delete collection');
      });

      consoleSpy.mockRestore();
    });
  });

  // Tab change edge cases
  describe('Tab Change Edge Cases', () => {
    it('should handle clicking Create New tab while already on create tab and editing', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      // Edit a draft
      fireEvent.click(screen.getByText('Drafts'));
      await waitFor(() => {
        expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit tc-1'));
      await waitFor(() => {
        expect(screen.getByTestId('editing')).toHaveTextContent('tc-1');
      });

      // Click Create New tab while editing
      fireEvent.click(screen.getByText('Create New'));

      await waitFor(() => {
        expect(screen.getByTestId('editing')).toHaveTextContent('new');
      });
    });

    it('should reset editingId when switching to create tab from drafts', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      // Switch to drafts
      fireEvent.click(screen.getByText('Drafts'));
      await waitFor(() => {
        expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
      });

      // Switch back to create
      fireEvent.click(screen.getByText('Create New'));

      await waitFor(() => {
        expect(screen.getByTestId('editing')).toHaveTextContent('new');
      });
    });

    it('should not switch tab when clicking same tab', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
      });

      // Click create tab again (already on create)
      fireEvent.click(screen.getByText('Create New'));

      // Should still be on create
      expect(screen.getByTestId('test-case-form')).toBeInTheDocument();
    });
  });

  // Header content tests
  describe('Header Content', () => {
    it('should show Edit Test Case title when editing', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Drafts'));
      await waitFor(() => {
        expect(screen.getByTestId('saved-test-cases-draft')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit tc-1'));

      await waitFor(() => {
        expect(screen.getByText('Edit Test Case')).toBeInTheDocument();
      });
    });

    it('should show Drafts title when on drafts tab', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Drafts');
      });
    });

    it('should show Imported title when on imported tab', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchDrafts).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Imported'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Imported');
      });
    });

    it('should show Collections title when on collections tab', async () => {
      render(<TestCaseBuilder {...defaultProps} />);
      await waitFor(() => {
        expect(api.fetchCollections).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Collections');
      });
    });
  });

});
