import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostImportModal from './PostImportModal';

describe('PostImportModal', () => {
  const defaultProps = {
    onDelete: vi.fn(),
    onKeep: vi.fn(),
    onClose: vi.fn(),
    isBulkImport: false,
    count: 1,
  };

  it('should render success title', () => {
    render(<PostImportModal {...defaultProps} />);
    expect(screen.getByText('Import Successful!')).toBeInTheDocument();
  });

  it('should render single test case message when not bulk import', () => {
    render(<PostImportModal {...defaultProps} />);
    expect(screen.getByText('Your test case was successfully imported to Xray.')).toBeInTheDocument();
    expect(screen.getByText('Would you like to delete this test case from your local storage?')).toBeInTheDocument();
  });

  it('should render bulk message for single item', () => {
    render(<PostImportModal {...defaultProps} isBulkImport={true} count={1} />);
    expect(screen.getByText('1 test case was successfully imported to Xray.')).toBeInTheDocument();
    expect(screen.getByText('Would you like to delete these test cases from your local storage?')).toBeInTheDocument();
  });

  it('should render bulk message for multiple items', () => {
    render(<PostImportModal {...defaultProps} isBulkImport={true} count={5} />);
    expect(screen.getByText('5 test cases were successfully imported to Xray.')).toBeInTheDocument();
  });

  it('should render disclaimer text', () => {
    render(<PostImportModal {...defaultProps} />);
    expect(screen.getByText('This only affects your local files, not Xray.')).toBeInTheDocument();
  });

  it('should call onKeep when Keep button is clicked', () => {
    const onKeep = vi.fn();
    render(<PostImportModal {...defaultProps} onKeep={onKeep} />);

    fireEvent.click(screen.getByText('Keep (Mark as Imported)'));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete when Delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<PostImportModal {...defaultProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete from Local'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

});
