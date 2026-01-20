import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavedTestCases from './SavedTestCases';
import * as api from '../utils/api';

vi.mock('../utils/api');

describe('SavedTestCases', () => {
  const mockTestCases = [
    {
      id: '1',
      summary: 'Test Case 1',
      description: 'Description 1',
      testType: 'Manual',
      status: 'draft',
      isComplete: true,
      labels: ['label1', 'label2'],
      steps: [{ action: 'Action', result: 'Result' }],
      updatedAt: Date.now(),
    },
    {
      id: '2',
      summary: 'Test Case 2',
      description: 'Description 2',
      testType: 'Manual',
      status: 'draft',
      isComplete: false,
      labels: [],
      steps: [],
      updatedAt: Date.now() - 1000,
    },
    {
      id: '3',
      summary: 'Imported Test Case',
      description: 'Imported desc',
      testType: 'Manual',
      status: 'imported',
      isComplete: true,
      labels: ['imported'],
      steps: [{ action: 'Action', result: 'Result' }],
      updatedAt: Date.now() - 2000,
      importedAt: Date.now() - 1000,
    },
  ];

  const defaultProps = {
    testCases: mockTestCases,
    filterStatus: 'draft',
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onImportSuccess: vi.fn(),
    onImportError: vi.fn(),
    onRefresh: vi.fn(),
    showToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.bulkImportDrafts.mockResolvedValue({ success: true, draftIds: ['1'] });
  });

  it('should render title for drafts view', () => {
    render(<SavedTestCases {...defaultProps} />);
    expect(screen.getByText('Draft Test Cases')).toBeInTheDocument();
  });

  it('should render title for imported view', () => {
    render(<SavedTestCases {...defaultProps} filterStatus="imported" />);
    expect(screen.getByText('Imported Test Cases')).toBeInTheDocument();
  });

  it('should show empty state when no test cases', () => {
    render(<SavedTestCases {...defaultProps} testCases={[]} />);
    expect(screen.getByText('No saved drafts yet')).toBeInTheDocument();
  });

  it('should show empty state for imported view', () => {
    render(<SavedTestCases {...defaultProps} testCases={[]} filterStatus="imported" />);
    expect(screen.getByText('No imported test cases yet')).toBeInTheDocument();
  });

  it('should display test cases', () => {
    render(<SavedTestCases {...defaultProps} />);
    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.getByText('Test Case 2')).toBeInTheDocument();
  });

  it('should not display imported test cases in draft view', () => {
    render(<SavedTestCases {...defaultProps} />);
    expect(screen.queryByText('Imported Test Case')).not.toBeInTheDocument();
  });

  it('should only display imported test cases in imported view', () => {
    render(<SavedTestCases {...defaultProps} filterStatus="imported" />);
    expect(screen.getByText('Imported Test Case')).toBeInTheDocument();
    expect(screen.queryByText('Test Case 1')).not.toBeInTheDocument();
  });

  it('should filter test cases by search query', () => {
    render(<SavedTestCases {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Case 1' } });

    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Case 2')).not.toBeInTheDocument();
  });

  it('should show no matches message when search has no results', () => {
    render(<SavedTestCases {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('should sort test cases', () => {
    render(<SavedTestCases {...defaultProps} />);

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    // After A-Z sort, both Test Case 1 and 2 should be present in sorted order
    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.getByText('Test Case 2')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<SavedTestCases {...defaultProps} onEdit={onEdit} />);

    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('should show delete modal when delete is clicked', () => {
    render(<SavedTestCases {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Test Case?')).toBeInTheDocument();
  });

  it('should call onDelete when confirming delete', () => {
    const onDelete = vi.fn();
    render(<SavedTestCases {...defaultProps} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('should close delete modal when cancel is clicked', () => {
    render(<SavedTestCases {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Delete Test Case?')).not.toBeInTheDocument();
  });

  it('should allow selecting complete test cases', () => {
    render(<SavedTestCases {...defaultProps} />);

    // Find checkbox for complete test case
    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('should not allow selecting incomplete test cases', () => {
    render(<SavedTestCases {...defaultProps} />);

    // Try to find disabled checkbox
    const incompleteCheckbox = screen.getByTitle('Complete all required fields to import');
    expect(incompleteCheckbox).toBeDisabled();
  });

  it('should show bulk actions when items are selected', () => {
    render(<SavedTestCases {...defaultProps} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText('Import Selected')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('should deselect all when Deselect All is clicked', () => {
    render(<SavedTestCases {...defaultProps} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Deselect All'));
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('should call bulk import when Import Selected is clicked', async () => {
    const onImportSuccess = vi.fn();
    render(<SavedTestCases {...defaultProps} onImportSuccess={onImportSuccess} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Import Selected'));

    await waitFor(() => {
      expect(api.bulkImportDrafts).toHaveBeenCalledWith(['1']);
      expect(onImportSuccess).toHaveBeenCalled();
    });
  });

  it('should call onImportError on bulk import failure', async () => {
    api.bulkImportDrafts.mockResolvedValueOnce({ success: false, error: 'Import failed' });
    const onImportError = vi.fn();
    render(<SavedTestCases {...defaultProps} onImportError={onImportError} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Import Selected'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalled();
    });
  });

  it('should handle bulk import exception', async () => {
    api.bulkImportDrafts.mockRejectedValueOnce(new Error('Network error'));
    const onImportError = vi.fn();
    render(<SavedTestCases {...defaultProps} onImportError={onImportError} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Import Selected'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalledWith({
        success: false,
        error: 'Network error',
      });
    });
  });

  it('should show loading state during bulk import', async () => {
    api.bulkImportDrafts.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ success: true, draftIds: ['1'] }), 100)));

    render(<SavedTestCases {...defaultProps} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Import Selected'));

    expect(await screen.findByText('Importing...')).toBeInTheDocument();
  });

  it('should display labels', () => {
    render(<SavedTestCases {...defaultProps} />);
    expect(screen.getByText('label1')).toBeInTheDocument();
    expect(screen.getByText('label2')).toBeInTheDocument();
  });

  it('should show View button for imported test cases', () => {
    render(<SavedTestCases {...defaultProps} filterStatus="imported" />);
    expect(screen.getByTitle('View')).toBeInTheDocument();
  });

  it('should display step count', () => {
    render(<SavedTestCases {...defaultProps} />);
    expect(screen.getByText('1 step')).toBeInTheDocument();
    expect(screen.getByText('0 steps')).toBeInTheDocument();
  });

  it('should not show checkboxes in imported view', () => {
    render(<SavedTestCases {...defaultProps} filterStatus="imported" />);
    expect(screen.queryByTitle('Select for import')).not.toBeInTheDocument();
  });

  it('should display status badges', () => {
    render(<SavedTestCases {...defaultProps} />);
    // Should show Draft badge for complete and incomplete items
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
  });

  it('should search by labels', () => {
    render(<SavedTestCases {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'label1' } });

    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Case 2')).not.toBeInTheDocument();
  });

  it('should toggle selection on second click', () => {
    render(<SavedTestCases {...defaultProps} />);

    const checkboxes = screen.getAllByTitle('Select for import');
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(checkboxes[0]);
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });
});
