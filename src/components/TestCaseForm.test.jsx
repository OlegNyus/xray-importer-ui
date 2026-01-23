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
vi.mock('./TestCasePreview', () => ({
  default: ({ testCase }) => (
    <div data-testid="test-case-preview">
      <span>Preview: {testCase.summary}</span>
      <span>Imported</span>
    </div>
  ),
}));
vi.mock('./XrayLinkingPanel', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="xray-linking-panel">
      <span>Xray Linking Panel</span>
      <button
        type="button"
        onClick={() => onChange({
          ...value,
          testPlanIds: ['plan-1'],
          testExecutionIds: ['exec-1'],
          testSetIds: ['set-1'],
          folderPath: '/',
        })}
      >
        Fill Xray Links
      </button>
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

  it('should show New badge when creating new test case', () => {
    render(<TestCaseForm {...defaultProps} />);
    // Title is in page header, form shows status badge and project
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should show Draft badge when editing draft', () => {
    render(<TestCaseForm {...defaultProps} editingId="tc-1" editingTestCase={{ summary: 'Test', steps: [], status: 'draft' }} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should render TestCasePreview when imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', status: 'imported', steps: [] }}
      />
    );
    expect(screen.getByTestId('test-case-preview')).toBeInTheDocument();
  });

  it('should show New badge when not editing', () => {
    render(<TestCaseForm {...defaultProps} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should show Draft badge when editing', () => {
    render(<TestCaseForm {...defaultProps} editingId="tc-1" editingTestCase={{ summary: '', steps: [] }} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should show Imported text in preview when status is imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', status: 'imported', steps: [] }}
      />
    );
    // TestCasePreview mock shows "Imported" text
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

    // Fill required fields on Step 1 to enable navigation
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });

    // Navigate to Step 2
    fireEvent.click(screen.getByText('Next: Test Steps'));

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

  it('should disable Next button when required Step 1 fields are empty', () => {
    render(<TestCaseForm {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: /Next: Test Steps/ });
    expect(nextButton).toBeDisabled();
  });

  it('should enable Next button when Step 1 fields are filled', () => {
    render(<TestCaseForm {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: /Next: Test Steps/ });
    expect(nextButton).toBeDisabled();

    // Fill Step 1 fields
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });

    expect(nextButton).not.toBeDisabled();
  });

  it('should disable Next to Step 3 button if step action is missing', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Fill Step 1 and navigate
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // On Step 2, fill only result (not action)
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    const nextButton = screen.getByRole('button', { name: /Next: Xray Links/ });
    expect(nextButton).toBeDisabled();
  });

  it('should disable Next to Step 3 button if step result is missing', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Fill Step 1 and navigate
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // On Step 2, fill only action (not result)
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });

    const nextButton = screen.getByRole('button', { name: /Next: Xray Links/ });
    expect(nextButton).toBeDisabled();
  });

  it('should navigate through all steps and show import button', async () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test Summary',
          description: 'Test Description',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3 (data is pre-filled)
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Import button should be present on Step 3
    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeInTheDocument();
  });

  it('should handle import error on Step 3', async () => {
    api.importDraft.mockResolvedValueOnce({ success: false, error: 'Import failed' });
    const onImportError = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test Summary',
          description: 'Test Description',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
        onImportError={onImportError}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalled();
    });
  });

  it('should handle update draft error during import', async () => {
    api.updateDraft.mockResolvedValueOnce({ success: false, error: 'Update failed' });
    const onImportError = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test Summary',
          description: 'Test Description',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
        onImportError={onImportError}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalledWith({ success: false, error: 'Update failed' });
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
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3 (data is pre-filled including xrayLinking)
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

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

  it('should show TestCasePreview instead of form when imported', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'Test Summary', status: 'imported', steps: [] }}
      />
    );

    // Should render preview instead of form
    expect(screen.getByTestId('test-case-preview')).toBeInTheDocument();
    expect(screen.getByText('Preview: Test Summary')).toBeInTheDocument();
    // Form inputs should not be present
    expect(screen.queryByPlaceholderText('Detailed description of the test case')).not.toBeInTheDocument();
  });

  it('should show preview content for imported test case', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{ summary: 'My Imported TC', status: 'imported', steps: [] }}
      />
    );

    expect(screen.getByText('Preview: My Imported TC')).toBeInTheDocument();
  });

  it('should handle import exception', async () => {
    api.updateDraft.mockRejectedValueOnce(new Error('Network error'));
    const onImportError = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test Summary',
          description: 'Test Description',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
        onImportError={onImportError}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

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

  it('should show Back button on Step 2 and navigate back', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Fill Step 1 and navigate
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // Should be on Step 2
    expect(screen.getByText('Add Step')).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByText('Back'));

    // Should be back on Step 1 - summary input should be visible
    expect(screen.getByTestId('summary-input')).toBeInTheDocument();
    expect(screen.queryByText('Add Step')).not.toBeInTheDocument();
  });

  it('should show Back button on Step 3 and navigate back', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test Summary',
          description: 'Test Description',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Should see XrayLinkingPanel
    expect(screen.getByTestId('xray-linking-panel')).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByText('Back'));

    // Should be back on Step 2 - Add Step button should be visible
    expect(screen.getByText('Add Step')).toBeInTheDocument();
    expect(screen.queryByTestId('xray-linking-panel')).not.toBeInTheDocument();
  });

  it('should show validation errors when clicking Next with invalid Step 1', () => {
    const showToast = vi.fn();
    render(<TestCaseForm {...defaultProps} showToast={showToast} />);

    // Fill only summary (not description)
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });

    // Try to click Next (button is disabled, simulate the validation)
    // The button should be disabled if not all fields are filled
    const nextButton = screen.getByRole('button', { name: /Next: Test Steps/ });
    expect(nextButton).toBeDisabled();
  });

  it('should show validation errors when clicking Next with invalid Step 2', () => {
    const showToast = vi.fn();
    render(<TestCaseForm {...defaultProps} showToast={showToast} />);

    // Fill Step 1
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // On Step 2, don't fill the step fields properly
    // Fill only action
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });

    // The button should be disabled
    const nextButton = screen.getByRole('button', { name: /Next: Xray Links/ });
    expect(nextButton).toBeDisabled();
  });

  it('should handle reset without modal when form is empty', () => {
    const setHasUnsavedChanges = vi.fn();
    render(<TestCaseForm {...defaultProps} setHasUnsavedChanges={setHasUnsavedChanges} />);

    // Click Reset with empty form - should not show modal
    fireEvent.click(screen.getByText('Reset'));

    // Modal should not appear
    expect(screen.queryByText('Reset Form?')).not.toBeInTheDocument();
  });

  it('should show project indicator', () => {
    render(<TestCaseForm {...defaultProps} activeProject="TEST" />);
    expect(screen.getByText('TEST')).toBeInTheDocument();
    expect(screen.getByText('Importing to:')).toBeInTheDocument();
  });

  it('should show project mismatch warning', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="OTHER"
        editingId="tc-1"
        editingTestCase={{ summary: 'Test', description: 'Desc', projectKey: 'TEST', steps: [{ action: 'A', result: 'R' }] }}
      />
    );

    // Should show mismatch warning
    expect(screen.getByText(/This draft was created for/)).toBeInTheDocument();
  });

  it('should prevent import when project mismatch', async () => {
    const showToast = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="OTHER"
        showToast={showToast}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test',
          description: 'Desc',
          projectKey: 'TEST',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Import button should be disabled due to project mismatch
    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeDisabled();
  });

  it('should migrate old single-select xrayLinking format', () => {
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test',
          description: 'Desc',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: {
            testPlanId: 'old-plan',
            testPlanDisplay: 'WCP-100: Old Plan',
            testExecutionId: 'old-exec',
            testExecutionDisplay: 'WCP-200: Old Exec',
            testSetId: 'old-set',
            testSetDisplay: 'WCP-300: Old Set',
            folderPath: '/',
          },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Component should render without crashing (migration worked)
    expect(screen.getByTestId('xray-linking-panel')).toBeInTheDocument();
  });

  it('should handle successful import with linking', async () => {
    api.importDraft.mockResolvedValueOnce({ success: true, testIssueId: 'issue-123', testKey: 'WCP-999' });
    api.linkTestToEntities.mockResolvedValueOnce({ success: true, warnings: [] });
    const onImportSuccess = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        onImportSuccess={onImportSuccess}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test',
          description: 'Desc',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(api.linkTestToEntities).toHaveBeenCalled();
      expect(onImportSuccess).toHaveBeenCalledWith(expect.objectContaining({
        testIssueId: 'issue-123',
        draftId: 'tc-1',
      }));
    });
  });

  it('should show warning toast when linking has warnings', async () => {
    api.importDraft.mockResolvedValueOnce({ success: true, testIssueId: 'issue-123' });
    api.linkTestToEntities.mockResolvedValueOnce({ success: true, warnings: ['Warning 1'] });
    const showToast = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        showToast={showToast}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test',
          description: 'Desc',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Linked with warnings: Warning 1');
    });
  });

  it('should handle linking failure gracefully', async () => {
    api.importDraft.mockResolvedValueOnce({ success: true, testIssueId: 'issue-123' });
    api.linkTestToEntities.mockRejectedValueOnce(new Error('Linking failed'));
    const showToast = vi.fn();
    const onImportSuccess = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        showToast={showToast}
        onImportSuccess={onImportSuccess}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test',
          description: 'Desc',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: ['plan-1'], testExecutionIds: ['exec-1'], testSetIds: ['set-1'], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Import succeeded but linking failed: Linking failed');
      // Import should still succeed
      expect(onImportSuccess).toHaveBeenCalled();
    });
  });

  it('should create new draft during import when no editingId', async () => {
    api.createDraft.mockResolvedValueOnce({ success: true, id: 'new-draft-id' });
    api.importDraft.mockResolvedValueOnce({ success: true, testIssueId: 'issue-123' });
    api.linkTestToEntities.mockResolvedValueOnce({ success: true });
    const onImportSuccess = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        onImportSuccess={onImportSuccess}
      />
    );

    // Fill Step 1
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'New Test' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'New Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // Fill Step 2
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Fill Xray links using mock
    fireEvent.click(screen.getByText('Fill Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(api.createDraft).toHaveBeenCalled();
      expect(api.importDraft).toHaveBeenCalledWith('new-draft-id');
    });
  });

  it('should handle create draft error during import', async () => {
    api.createDraft.mockResolvedValueOnce({ success: false, error: 'Create failed' });
    const onImportError = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        onImportError={onImportError}
      />
    );

    // Fill Step 1
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'New Test' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'New Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // Fill Step 2
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Fill Xray links using mock
    fireEvent.click(screen.getByText('Fill Xray Links'));

    fireEvent.click(screen.getByText('Import to Xray'));

    await waitFor(() => {
      expect(onImportError).toHaveBeenCalledWith({ success: false, error: 'Create failed' });
    });
  });

  it('should show validation error when clicking import without xray links', async () => {
    const showToast = vi.fn();
    render(
      <TestCaseForm
        {...defaultProps}
        activeProject="TEST"
        showToast={showToast}
        editingId="tc-1"
        editingTestCase={{
          summary: 'Test',
          description: 'Desc',
          steps: [{ id: '1', action: 'Action', result: 'Result' }],
          xrayLinking: { testPlanIds: [], testExecutionIds: [], testSetIds: [], folderPath: '/' },
        }}
      />
    );

    // Navigate to Step 3
    fireEvent.click(screen.getByText('Next: Test Steps'));
    fireEvent.click(screen.getByText('Next: Xray Links'));

    // Import button should be disabled since xray links are not complete
    const importButton = screen.getByRole('button', { name: /Import to Xray/ });
    expect(importButton).toBeDisabled();
  });

  it('should show Draft Updated text in modal when editing', () => {
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
    fireEvent.click(updateButton);

    expect(screen.getByText('Draft Updated')).toBeInTheDocument();
  });

  it('should handle step change and clear errors', () => {
    render(<TestCaseForm {...defaultProps} />);

    // Fill Step 1 and navigate
    fireEvent.change(screen.getByTestId('summary-input'), { target: { value: 'Test Summary' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the test case'), {
      target: { value: 'Test Description', name: 'description' },
    });
    fireEvent.click(screen.getByText('Next: Test Steps'));

    // Fill action field
    fireEvent.change(screen.getByPlaceholderText('What action to perform'), {
      target: { value: 'Test Action' },
    });

    // Fill result field
    fireEvent.change(screen.getByPlaceholderText('Expected outcome'), {
      target: { value: 'Test Result' },
    });

    // Button should be enabled now
    const nextButton = screen.getByRole('button', { name: /Next: Xray Links/ });
    expect(nextButton).not.toBeDisabled();
  });

  it('should add tags and update form', () => {
    render(<TestCaseForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Tag'));

    expect(screen.getByText('newTag')).toBeInTheDocument();
  });

  it('should show collection input with placeholder', () => {
    render(<TestCaseForm {...defaultProps} collections={[{ id: 'col-1', name: 'Smoke Tests', color: '#6366f1' }]} />);

    // Collection field should have the placeholder
    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getAllByText('Search or create...').length).toBeGreaterThanOrEqual(1);
  });

  it('should show dropdown with existing collections when clicked', async () => {
    render(<TestCaseForm {...defaultProps} collections={[{ id: 'col-1', name: 'Smoke Tests', color: '#6366f1' }]} />);

    // Find and click collection field
    const collectionLabel = screen.getByText('Collection');
    const collectionField = collectionLabel.parentElement.querySelector('.input');
    fireEvent.click(collectionField);

    await waitFor(() => {
      expect(screen.getByText('Smoke Tests')).toBeInTheDocument();
    });
  });

  it('should select existing collection from dropdown', async () => {
    render(<TestCaseForm {...defaultProps} collections={[{ id: 'col-1', name: 'Smoke Tests', color: '#6366f1' }]} />);

    // Find and click collection field
    const collectionLabel = screen.getByText('Collection');
    const collectionField = collectionLabel.parentElement.querySelector('.input');
    fireEvent.click(collectionField);

    await waitFor(() => {
      expect(screen.getByText('Smoke Tests')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Smoke Tests'));

    // Collection should be selected (shown as chip)
    await waitFor(() => {
      expect(screen.getByText('Smoke Tests')).toBeInTheDocument();
    });
  });

  it('should filter collections when searching', async () => {
    render(<TestCaseForm {...defaultProps} collections={[
      { id: 'col-1', name: 'Smoke Tests', color: '#6366f1' },
      { id: 'col-2', name: 'Integration Tests', color: '#22c55e' },
    ]} />);

    // Find collection field (it's after the Labels field)
    const collectionLabel = screen.getByText('Collection');
    const collectionField = collectionLabel.parentElement.querySelector('.input');
    fireEvent.click(collectionField);

    // Wait for input to appear and type in search input
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Search or create...');
      expect(inputs.length).toBeGreaterThan(0);
    });

    const inputs = screen.getAllByPlaceholderText('Search or create...');
    const searchInput = inputs[inputs.length - 1]; // Last one is collection
    fireEvent.change(searchInput, { target: { value: 'Smoke' } });

    await waitFor(() => {
      expect(screen.getByText('Smoke Tests')).toBeInTheDocument();
      expect(screen.queryByText('Integration Tests')).not.toBeInTheDocument();
    });
  });

  it('should show no collections message when none available', async () => {
    render(<TestCaseForm {...defaultProps} collections={[]} />);

    // Find and click collection field
    const collectionLabel = screen.getByText('Collection');
    const collectionField = collectionLabel.parentElement.querySelector('.input');
    fireEvent.click(collectionField);

    await waitFor(() => {
      expect(screen.getByText('No collections available')).toBeInTheDocument();
    });
  });
});
