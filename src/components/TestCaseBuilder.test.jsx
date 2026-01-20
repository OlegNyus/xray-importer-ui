import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestCaseBuilder from './TestCaseBuilder';
import * as api from '../utils/api';

vi.mock('../utils/api');
vi.mock('./TestCaseForm', () => ({
  default: ({ editingTestCase, onSaveDraft, onCreateNew }) => (
    <div data-testid="test-case-form">
      <span data-testid="editing">{editingTestCase?.id || 'new'}</span>
      <button onClick={() => onSaveDraft({ summary: 'Test' })}>Save Draft Mock</button>
      <button onClick={onCreateNew}>Create New Mock</button>
    </div>
  ),
}));
vi.mock('./SavedTestCases', () => ({
  default: ({ filterStatus, onEdit, onDelete }) => (
    <div data-testid={`saved-test-cases-${filterStatus}`}>
      <button onClick={() => onEdit('tc-1')}>Edit tc-1</button>
      <button onClick={() => onDelete('tc-1')}>Delete tc-1</button>
    </div>
  ),
}));

describe('TestCaseBuilder', () => {
  const mockConfig = {
    projectKey: 'TEST',
    xrayClientId: 'test-id',
    xrayClientSecret: 'test-secret',
    jiraBaseUrl: 'https://test.atlassian.net',
  };

  const mockDrafts = [
    { id: 'tc-1', summary: 'Test 1', status: 'draft' },
    { id: 'tc-2', summary: 'Test 2', status: 'imported' },
  ];

  const defaultProps = {
    config: mockConfig,
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
});
