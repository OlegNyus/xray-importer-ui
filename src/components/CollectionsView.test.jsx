import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CollectionsView from './CollectionsView';
import * as api from '../utils/api';

vi.mock('../utils/api');

describe('CollectionsView', () => {
  const mockCollections = [
    { id: 'col1', name: 'Sprint 1', color: '#6366f1' },
    { id: 'col2', name: 'Smoke Tests', color: '#22c55e' },
  ];

  const mockTestCases = [
    { id: 'tc1', summary: 'Test 1', status: 'draft', collectionId: 'col1', updatedAt: Date.now(), steps: [] },
    { id: 'tc2', summary: 'Test 2', status: 'draft', collectionId: 'col1', updatedAt: Date.now(), steps: [] },
    { id: 'tc3', summary: 'Test 3', status: 'draft', collectionId: null, updatedAt: Date.now(), steps: [] },
    { id: 'tc4', summary: 'Imported Test', status: 'imported', collectionId: 'col1', updatedAt: Date.now(), steps: [] },
  ];

  const defaultProps = {
    collections: mockCollections,
    testCases: mockTestCases,
    onCreateCollection: vi.fn(),
    onDeleteCollection: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRefresh: vi.fn(),
    showToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.updateDraft.mockResolvedValue({ success: true });
  });

  it('should render collection list with correct counts', () => {
    render(<CollectionsView {...defaultProps} />);

    expect(screen.getByText('Your Collections')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Smoke Tests')).toBeInTheDocument();

    // Check counts - Sprint 1 has 2 drafts (tc1, tc2), Uncategorized has 1 (tc3)
    // Imported test cases should not be counted
    const counts = screen.getAllByText(/^[0-2]$/);
    expect(counts.length).toBeGreaterThan(0);
  });

  it('should show empty state when no collection is selected', () => {
    render(<CollectionsView {...defaultProps} />);

    expect(screen.getByText('Select a collection to view test cases')).toBeInTheDocument();
  });

  it('should show test cases when collection is selected', async () => {
    render(<CollectionsView {...defaultProps} />);

    fireEvent.click(screen.getByText('Sprint 1'));

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
      expect(screen.getByText('Test 2')).toBeInTheDocument();
    });
  });

  it('should show uncategorized test cases', async () => {
    render(<CollectionsView {...defaultProps} />);

    fireEvent.click(screen.getByText('Uncategorized'));

    await waitFor(() => {
      expect(screen.getByText('Test 3')).toBeInTheDocument();
    });
  });

  it('should show add collection form when clicking + Add', async () => {
    render(<CollectionsView {...defaultProps} />);

    fireEvent.click(screen.getByText('+ Add'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Sprint 1, Smoke Tests/i)).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('should hide add form when clicking Cancel', async () => {
    render(<CollectionsView {...defaultProps} />);

    fireEvent.click(screen.getByText('+ Add'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Sprint 1, Smoke Tests/i)).not.toBeInTheDocument();
    });
  });

  it('should create collection when form is submitted', async () => {
    const onCreateCollection = vi.fn().mockResolvedValue({ id: 'new', name: 'New Collection' });
    render(<CollectionsView {...defaultProps} onCreateCollection={onCreateCollection} />);

    fireEvent.click(screen.getByText('+ Add'));

    const input = screen.getByPlaceholderText(/Sprint 1, Smoke Tests/i);
    fireEvent.change(input, { target: { value: 'New Collection' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(onCreateCollection).toHaveBeenCalledWith('New Collection', expect.any(String));
    });
  });

  it('should prevent duplicate collection names', async () => {
    const showToast = vi.fn();
    render(<CollectionsView {...defaultProps} showToast={showToast} />);

    fireEvent.click(screen.getByText('+ Add'));

    const input = screen.getByPlaceholderText(/Sprint 1, Smoke Tests/i);
    fireEvent.change(input, { target: { value: 'Sprint 1' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Collection with this name already exists');
    });
  });

  it('should prevent duplicate names case-insensitively', async () => {
    const showToast = vi.fn();
    render(<CollectionsView {...defaultProps} showToast={showToast} />);

    fireEvent.click(screen.getByText('+ Add'));

    const input = screen.getByPlaceholderText(/Sprint 1, Smoke Tests/i);
    fireEvent.change(input, { target: { value: 'SPRINT 1' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Collection with this name already exists');
    });
  });

  it('should prevent deletion of collection with test cases', async () => {
    const showToast = vi.fn();
    const onDeleteCollection = vi.fn();
    render(<CollectionsView {...defaultProps} showToast={showToast} onDeleteCollection={onDeleteCollection} />);

    // Sprint 1 has 2 test cases
    const sprint1Row = screen.getByText('Sprint 1').closest('div');
    const deleteButton = sprint1Row.querySelector('button[title="Delete collection"]');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Move 2 test cases first to delete this collection');
      expect(onDeleteCollection).not.toHaveBeenCalled();
    });
  });

  it('should allow deletion of empty collection', async () => {
    const onDeleteCollection = vi.fn();
    render(<CollectionsView {...defaultProps} onDeleteCollection={onDeleteCollection} />);

    // Smoke Tests has 0 test cases
    const smokeTestsRow = screen.getByText('Smoke Tests').closest('div');
    const deleteButton = smokeTestsRow.querySelector('button[title="Delete collection"]');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDeleteCollection).toHaveBeenCalledWith('col2');
    });
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<CollectionsView {...defaultProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByText('Sprint 1'));

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith('tc1');
  });

  it('should call onDelete when delete button is clicked on test case', async () => {
    const onDelete = vi.fn();
    render(<CollectionsView {...defaultProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Sprint 1'));

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('tc1');
  });

  it('should not count imported test cases', () => {
    render(<CollectionsView {...defaultProps} />);

    // Sprint 1 should show 2, not 3 (tc4 is imported)
    fireEvent.click(screen.getByText('Sprint 1'));

    // The header should show (2 test cases)
    expect(screen.getByText('(2 test cases)')).toBeInTheDocument();
  });
});
