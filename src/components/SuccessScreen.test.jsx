import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessScreen from './SuccessScreen';

describe('SuccessScreen', () => {
  const defaultProps = {
    result: {
      success: true,
      jobId: 'job-123',
      draftId: 'draft-456',
      testKey: 'TEST-001',
    },
    config: {
      projectKey: 'TEST',
      jiraBaseUrl: 'https://test.atlassian.net',
    },
    onCreateAnother: vi.fn(),
    onPostImportDelete: vi.fn(),
    onPostImportKeep: vi.fn(),
  };

  it('should render success title', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText('Import Successful!')).toBeInTheDocument();
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

  it('should display test key as clickable link', () => {
    render(<SuccessScreen {...defaultProps} />);
    const link = screen.getByRole('link', { name: /TEST-001/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://test.atlassian.net/browse/TEST-001');
    expect(link).toHaveAttribute('target', '_blank');
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

  it('should show local storage options when draftId is present', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText('What would you like to do with the local draft?')).toBeInTheDocument();
  });

  it('should not show local storage options when no draftId', () => {
    render(<SuccessScreen {...defaultProps} result={{ jobId: 'job-123' }} />);
    expect(screen.queryByText('What would you like to do with the local draft?')).not.toBeInTheDocument();
  });

  it('should call onPostImportDelete with draftId when Delete is clicked', () => {
    const onPostImportDelete = vi.fn();
    render(<SuccessScreen {...defaultProps} onPostImportDelete={onPostImportDelete} />);

    fireEvent.click(screen.getByText('Delete Local'));
    expect(onPostImportDelete).toHaveBeenCalledWith('draft-456');
  });

  it('should call onPostImportKeep with draftId when Keep is clicked', () => {
    const onPostImportKeep = vi.fn();
    render(<SuccessScreen {...defaultProps} onPostImportKeep={onPostImportKeep} />);

    fireEvent.click(screen.getByText('Keep Local Copy'));
    expect(onPostImportKeep).toHaveBeenCalledWith('draft-456');
  });

  it('should hide local storage options after Delete is clicked', () => {
    render(<SuccessScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete Local'));
    expect(screen.queryByText('What would you like to do with the local draft?')).not.toBeInTheDocument();
  });

  it('should show deleted message after delete', () => {
    render(<SuccessScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete Local'));
    expect(screen.getByText('Local draft deleted')).toBeInTheDocument();
  });

  it('should show marked as imported message after keep', () => {
    render(<SuccessScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Keep Local Copy'));
    expect(screen.getByText('Marked as imported')).toBeInTheDocument();
  });

  describe('Bulk import', () => {
    const bulkProps = {
      ...defaultProps,
      result: {
        success: true,
        jobId: 'bulk-job-123',
        isBulkImport: true,
        draftIds: ['draft-1', 'draft-2', 'draft-3'],
        testKeys: ['TEST-001', 'TEST-002', 'TEST-003'],
      },
    };

    it('should render bulk message for multiple items', () => {
      render(<SuccessScreen {...bulkProps} />);
      expect(screen.getByText('3 test cases have been imported to Xray Cloud')).toBeInTheDocument();
    });

    it('should render singular message for single bulk item', () => {
      render(<SuccessScreen {...bulkProps} result={{ ...bulkProps.result, draftIds: ['draft-1'], testKeys: ['TEST-001'] }} />);
      expect(screen.getByText('1 test case has been imported to Xray Cloud')).toBeInTheDocument();
    });

    it('should display test cases count', () => {
      render(<SuccessScreen {...bulkProps} />);
      expect(screen.getByText('3 test cases')).toBeInTheDocument();
    });

    it('should display test keys as clickable links for bulk import', () => {
      render(<SuccessScreen {...bulkProps} />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute('href', 'https://test.atlassian.net/browse/TEST-001');
      expect(links[1]).toHaveAttribute('href', 'https://test.atlassian.net/browse/TEST-002');
      expect(links[2]).toHaveAttribute('href', 'https://test.atlassian.net/browse/TEST-003');
    });

    it('should truncate test keys when more than 3', () => {
      const manyKeys = {
        ...bulkProps,
        result: {
          ...bulkProps.result,
          draftIds: ['d1', 'd2', 'd3', 'd4', 'd5'],
          testKeys: ['T-001', 'T-002', 'T-003', 'T-004', 'T-005'],
        },
      };
      render(<SuccessScreen {...manyKeys} />);
      // Only first 3 keys are shown as links
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      // Plus the "+2 more" indicator
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('should call onPostImportDelete with draftIds array for bulk', () => {
      const onPostImportDelete = vi.fn();
      render(<SuccessScreen {...bulkProps} onPostImportDelete={onPostImportDelete} />);

      fireEvent.click(screen.getByText('Delete Local'));
      expect(onPostImportDelete).toHaveBeenCalledWith(['draft-1', 'draft-2', 'draft-3']);
    });

    it('should call onPostImportKeep with draftIds array for bulk', () => {
      const onPostImportKeep = vi.fn();
      render(<SuccessScreen {...bulkProps} onPostImportKeep={onPostImportKeep} />);

      fireEvent.click(screen.getByText('Keep Local Copy'));
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
});
