import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestCaseForm from './TestCaseForm';
import * as api from '../utils/api';

vi.mock('../utils/api');
vi.mock('./SummaryInput', () => ({
  default: ({ value, onChange, disabled }) => (
    <input
      data-testid="summary-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Summary"
    />
  ),
}));
vi.mock('./TagInput', () => ({
  default: ({ tags, onChange, disabled }) => (
    <div data-testid="tag-input">
      <span>{tags.join(', ')}</span>
      {!disabled && (
        <button onClick={() => onChange([...tags, 'newTag'])}>Add Tag</button>
      )}
    </div>
  ),
}));

describe('TestCaseForm', () => {
  const mockConfig = {
    projectKey: 'TEST',
    xrayClientId: 'test-id',
    xrayClientSecret: 'test-secret',
    jiraBaseUrl: 'https://test.atlassian.net',
  };

  const defaultProps = {
    config: mockConfig,
    editingTestCase: null,
    editingId: null,
    onSaveDraft: vi.fn(),
    onImportSuccess: vi.fn(),
    onImportError: vi.fn(),
    onCreateNew: vi.fn(),
    setHasUnsavedChanges: vi.fn(),
    showToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.createDraft.mockResolvedValue({ success: true, id: 'new-id', draft: { id: 'new-id' } });
    api.updateDraft.mockResolvedValue({ success: true, draft: { id: 'tc-1' } });
    api.importDraft.mockResolvedValue({ success: true, jobId: 'job-123' });
  });

  it('should render Create Test Case title when not editing', () => {
    render(<TestCaseForm {...defaultProps} />);
    expect(screen.getByText('Create Test Case')).toBeInTheDocument();
  });

  it('should render Edit Test Case title when editing', () => {
    render(<TestCaseForm {...defaultProps} editingId="tc-1" editingTestCase={{ summary: 'Test', steps: [] }} />);
    expect(screen.getByText('Edit Test Case')).toBeInTheDocument();
  });

  it('should render View Test Case title when imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', status: 'imported', steps: [] }}
      />
    );
    expect(screen.getByText('View Test Case')).toBeInTheDocument();
  });

  it('should show New badge when not editing', () => {
    render(<TestCaseForm {...defaultProps} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should show Draft badge when editing', () => {
    render(<TestCaseForm {...defaultProps} editingId="tc-1" editingTestCase={{ summary: '', steps: [] }} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should show Imported badge when status is imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', status: 'imported', steps: [] }}
      />
    );
    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('should call setHasUnsavedChanges when description changes', () => {
    const setHasUnsavedChanges = vi.fn();
    render(<TestCaseForm {...defaultProps} setHasUnsavedChanges={setHasUnsavedChanges} />);

    const descInput = screen.getByPlaceholderText('Detailed description of the test case');
    fireEvent.change(descInput, { target: { value: 'New desc', name: 'description' } });

    expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
  });

  it('should add step when Add Step is clicked', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Initially 1 step
    expect(screen.getAllByText(/Step \d+/).length).toBe(1);

    fireEvent.click(screen.getByText('Add Step'));

    // Now 2 steps
    expect(screen.getAllByText(/Step \d+/).length).toBe(2);
  });

  it('should call onSaveDraft when Save Draft is clicked', () => {
    const onSaveDraft = vi.fn();
    render(<TestCaseForm {...defaultProps} onSaveDraft={onSaveDraft} />);

    // Add some data to enable save
    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    // Find the save button by role
    const saveButton = screen.getByRole('button', { name: /Save Draft/ });
    fireEvent.click(saveButton);

    expect(onSaveDraft).toHaveBeenCalled();
  });

  it('should show saved modal after save', () => {
    render(<TestCaseForm {...defaultProps} />);

    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    const saveButton = screen.getByRole('button', { name: /Save Draft/ });
    fireEvent.click(saveButton);

    expect(screen.getByText('Draft Saved')).toBeInTheDocument();
  });

  it('should call onCreateNew when Create New is clicked in saved modal', () => {
    const onCreateNew = vi.fn();
    render(<TestCaseForm {...defaultProps} onCreateNew={onCreateNew} />);

    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    const saveButton = screen.getByRole('button', { name: /Save Draft/ });
    fireEvent.click(saveButton);
    fireEvent.click(screen.getByRole('button', { name: 'Create New' }));

    expect(onCreateNew).toHaveBeenCalled();
  });

  it('should close saved modal when Keep Editing is clicked', () => {
    render(<TestCaseForm {...defaultProps} />);

    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    const saveButton = screen.getByRole('button', { name: /Save Draft/ });
    fireEvent.click(saveButton);
    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));

    expect(screen.queryByText('Draft Saved')).not.toBeInTheDocument();
  });

  it('should disable Import button when required fields are empty', () => {
    render(<TestCaseForm {...defaultProps} />);

    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeDisabled();
  });

  it('should enable Import button when all required fields are filled', () => {
    render(<TestCaseForm {...defaultProps} />);

    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeDisabled();

    // Fill required fields
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    expect(importButton).not.toBeDisabled();
  });

  it('should disable Import button if step action is missing', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Fill all except step action
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeDisabled();
  });

  it('should disable Import button if step result is missing', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Fill all except step result
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });

    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeDisabled();
  });

  it('should import successfully with all fields', async () => {
    const onImportSuccess = vi.fn();
    render(<TestCaseForm {...defaultProps} onImportSuccess={onImportSuccess} />);

    // Fill required fields
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(api.createDraft).toHaveBeenCalled();
      expect(api.importDraft).toHaveBeenCalled();
      expect(onImportSuccess).toHaveBeenCalled();
    });
  });

  it('should handle import error', async () => {
    api.importDraft.mockResolvedValueOnce({ success: false, error: 'Import failed' });
    const onImportError = vi.fn();
    render(<TestCaseForm {...defaultProps} onImportError={onImportError} />);

    // Fill required fields
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalled();
    });
  });

  it('should handle create draft error during import', async () => {
    api.createDraft.mockResolvedValueOnce({ success: false, error: 'Create failed' });
    const onImportError = vi.fn();
    render(<TestCaseForm {...defaultProps} onImportError={onImportError} />);

    // Fill required fields
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalledWith({ success: false, error: 'Create failed' });
    });
  });

  it('should update draft during import when editing', async () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Existing Summary',
          description: 'Existing Desc',
          steps: [{ action: 'Action', result: 'Result' }],
        }}
      />
    );

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(api.updateDraft).toHaveBeenCalledWith('tc-1', expect.any(Object));
      expect(api.importDraft).toHaveBeenCalledWith('tc-1');
    });
  });

  it('should show reset modal when reset clicked with data', () => {
    render(<TestCaseForm {...defaultProps} />);

    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    fireEvent.click(screen.getByText('Reset'));

    expect(screen.getByText('Reset Form?')).toBeInTheDocument();
  });

  it('should reset form when confirmed', () => {
    const showToast = vi.fn();
    render(<TestCaseForm {...defaultProps} showToast={showToast} />);

    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    fireEvent.click(screen.getByText('Reset'));
    fireEvent.click(screen.getAllByText('Reset')[1]); // Second Reset button in modal

    expect(showToast).toHaveBeenCalledWith('Form reset');
  });

  it('should cancel reset when cancel clicked', () => {
    render(<TestCaseForm {...defaultProps} />);

    const summaryInput = screen.getByTestId('summary-input');
    fireEvent.change(summaryInput, { target: { value: 'Test Summary' } });

    fireEvent.click(screen.getByText('Reset'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Reset Form?')).not.toBeInTheDocument();
  });

  it('should disable inputs when imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', status: 'imported', steps: [] }}
      />
    );

    expect(screen.getByPlaceholderText('Detailed description of the test case')).toBeDisabled();
    expect(screen.getByTestId('summary-input')).toBeDisabled();
  });

  it('should show read-only message when imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', status: 'imported', steps: [] }}
      />
    );

    expect(screen.getByText(/This test case has been imported to Xray and cannot be modified/)).toBeInTheDocument();
  });

  it('should handle import exception', async () => {
    api.createDraft.mockRejectedValueOnce(new Error('Network error'));
    const onImportError = vi.fn();
    render(<TestCaseForm {...defaultProps} onImportError={onImportError} />);

    // Fill required fields
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalledWith({
        success: false,
        error: 'Network error',
      });
    });
  });

  it('should disable Update Draft button when editing with no changes', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', description: 'Desc', steps: [{ action: 'A', result: 'R' }] }}
      />
    );

    const updateButton = screen.getByRole('button', { name: /Update Draft/ });
    expect(updateButton).toBeDisabled();
  });

  it('should enable Update Draft button when editing and changes are made', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', description: 'Desc', steps: [{ action: 'A', result: 'R' }] }}
      />
    );

    const updateButton = screen.getByRole('button', { name: /Update Draft/ });
    expect(updateButton).toBeDisabled();

    // Make a change
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Updated Summary' } });

    expect(updateButton).not.toBeDisabled();
  });

  it('should disable Update Draft button again after saving', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', description: 'Desc', steps: [{ action: 'A', result: 'R' }] }}
      />
    );

    // Make a change
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Updated Summary' } });

    const updateButton = screen.getByRole('button', { name: /Update Draft/ });
    expect(updateButton).not.toBeDisabled();

    // Save draft
    fireEvent.click(updateButton);

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));

    // Button should be disabled again
    expect(updateButton).toBeDisabled();
  });
});
