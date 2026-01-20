import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessScreen from './SuccessScreen';

describe('SuccessScreen', () => {
  const defaultProps = {
    result: {
      success: true,
      jobId: 'job-123',
      draftId: 'draft-456',
    },
    config: {
      projectKey: 'TEST',
    },
    onCreateAnother: vi.fn(),
    onPostImportDelete: vi.fn(),
    onPostImportKeep: vi.fn(),
  };

  it('should render success title', () => {
    render(<SuccessScreen {...defaultProps} />);
    // There are two "Import Successful!" - one in main screen, one in modal
    const titles = screen.getAllByText('Import Successful!');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('should render single test case message', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText('Your test case has been imported to Xray Cloud')).toBeInTheDocument();
  });

  it('should display job ID', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText('job-123')).toBeInTheDocument();
  });

  it('should display project key', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('should display N/A when jobId is missing', () => {
    render(<SuccessScreen {...defaultProps} result={{ draftId: 'draft-456' }} />);
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('should display N/A when projectKey is missing', () => {
    render(<SuccessScreen {...defaultProps} config={{}} />);
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('should call onCreateAnother when button is clicked', () => {
    const onCreateAnother = vi.fn();
    render(<SuccessScreen {...defaultProps} onCreateAnother={onCreateAnother} result={{ jobId: 'job-123' }} />);

    fireEvent.click(screen.getByText('Create Another Test Case'));
    expect(onCreateAnother).toHaveBeenCalledTimes(1);
  });

  it('should show PostImportModal when draftId is present', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText('Would you like to delete this test case from your local storage?')).toBeInTheDocument();
  });

  it('should not show PostImportModal when no draftId', () => {
    render(<SuccessScreen {...defaultProps} result={{ jobId: 'job-123' }} />);
    expect(screen.queryByText('Would you like to delete this test case from your local storage?')).not.toBeInTheDocument();
  });

  it('should call onPostImportDelete with draftId when Delete is clicked', () => {
    const onPostImportDelete = vi.fn();
    render(<SuccessScreen {...defaultProps} onPostImportDelete={onPostImportDelete} />);

    fireEvent.click(screen.getByText('Delete from Local'));
    expect(onPostImportDelete).toHaveBeenCalledWith('draft-456');
  });

  it('should call onPostImportKeep with draftId when Keep is clicked', () => {
    const onPostImportKeep = vi.fn();
    render(<SuccessScreen {...defaultProps} onPostImportKeep={onPostImportKeep} />);

    fireEvent.click(screen.getByText('Keep (Mark as Imported)'));
    expect(onPostImportKeep).toHaveBeenCalledWith('draft-456');
  });

  it('should hide PostImportModal after Delete is clicked', () => {
    render(<SuccessScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete from Local'));
    expect(screen.queryByText('Would you like to delete this test case from your local storage?')).not.toBeInTheDocument();
  });

  it('should show local storage updated message after handling', () => {
    render(<SuccessScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Keep (Mark as Imported)'));
    expect(screen.getByText('Local storage updated')).toBeInTheDocument();
  });

  describe('Bulk import', () => {
    const bulkProps = {
      ...defaultProps,
      result: {
        success: true,
        jobId: 'bulk-job-123',
        isBulkImport: true,
        draftIds: ['draft-1', 'draft-2', 'draft-3'],
      },
    };

    it('should render bulk message for multiple items', () => {
      render(<SuccessScreen {...bulkProps} />);
      expect(screen.getByText('3 test cases have been imported to Xray Cloud')).toBeInTheDocument();
    });

    it('should render singular message for single bulk item', () => {
      render(<SuccessScreen {...bulkProps} result={{ ...bulkProps.result, draftIds: ['draft-1'] }} />);
      expect(screen.getByText('1 test case has been imported to Xray Cloud')).toBeInTheDocument();
    });

    it('should display test cases count', () => {
      render(<SuccessScreen {...bulkProps} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show bulk PostImportModal message', () => {
      render(<SuccessScreen {...bulkProps} />);
      expect(screen.getByText('Would you like to delete these test cases from your local storage?')).toBeInTheDocument();
    });

    it('should call onPostImportDelete with draftIds array for bulk', () => {
      const onPostImportDelete = vi.fn();
      render(<SuccessScreen {...bulkProps} onPostImportDelete={onPostImportDelete} />);

      fireEvent.click(screen.getByText('Delete from Local'));
      expect(onPostImportDelete).toHaveBeenCalledWith(['draft-1', 'draft-2', 'draft-3']);
    });

    it('should call onPostImportKeep with draftIds array for bulk', () => {
      const onPostImportKeep = vi.fn();
      render(<SuccessScreen {...bulkProps} onPostImportKeep={onPostImportKeep} />);

      fireEvent.click(screen.getByText('Keep (Mark as Imported)'));
      expect(onPostImportKeep).toHaveBeenCalledWith(['draft-1', 'draft-2', 'draft-3']);
    });
  });

  describe('Output toggle', () => {
    const propsWithOutput = {
      ...defaultProps,
      result: {
        ...defaultProps.result,
        output: 'Script output text here',
      },
    };

    it('should show View Script Output button when output exists', () => {
      render(<SuccessScreen {...propsWithOutput} />);
      expect(screen.getByText('View Script Output')).toBeInTheDocument();
    });

    it('should not show View Script Output button when no output', () => {
      render(<SuccessScreen {...defaultProps} />);
      expect(screen.queryByText('View Script Output')).not.toBeInTheDocument();
    });

    it('should toggle output visibility when button is clicked', () => {
      render(<SuccessScreen {...propsWithOutput} />);

      expect(screen.queryByText('Script output text here')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('View Script Output'));
      expect(screen.getByText('Script output text here')).toBeInTheDocument();

      fireEvent.click(screen.getByText('View Script Output'));
      expect(screen.queryByText('Script output text here')).not.toBeInTheDocument();
    });
  });

  it('should close PostImportModal when clicking outside', () => {
    render(<SuccessScreen {...defaultProps} />);

    const overlay = document.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(screen.queryByText('Would you like to delete this test case from your local storage?')).not.toBeInTheDocument();
  });
});
