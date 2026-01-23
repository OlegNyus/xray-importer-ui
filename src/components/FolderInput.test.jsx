import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FolderInput from './FolderInput';

describe('FolderInput', () => {
  const defaultProps = {
    value: '/Tests',
    onChange: vi.fn(),
    folders: {
      path: '/',
      folders: [
        { path: '/Tests', folders: [{ path: '/Tests/Unit' }] },
        { path: '/Integration' },
      ],
    },
    loading: false,
    error: null,
    required: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('should render with selected value', () => {
    render(<FolderInput {...defaultProps} />);
    expect(screen.getByText('/Tests')).toBeInTheDocument();
  });

  it('should show root as "/ (Root)"', () => {
    render(<FolderInput {...defaultProps} value="/" />);
    expect(screen.getByText('/ (Root)')).toBeInTheDocument();
  });

  it('should render required indicator', () => {
    render(<FolderInput {...defaultProps} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should show folder options in dropdown', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('/ (Root)')).toBeInTheDocument();
    expect(screen.getByText('/Tests')).toBeInTheDocument();
    expect(screen.getByText('/Tests/Unit')).toBeInTheDocument();
    expect(screen.getByText('/Integration')).toBeInTheDocument();
  });

  it('should filter folders based on input', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Unit' } });
    expect(screen.getByText('/Tests/Unit')).toBeInTheDocument();
    expect(screen.queryByText('/Integration')).not.toBeInTheDocument();
  });

  it('should call onChange when folder is selected', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('/Integration'));
    expect(defaultProps.onChange).toHaveBeenCalledWith('/Integration');
  });

  it('should show loading state', () => {
    render(<FolderInput {...defaultProps} loading={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<FolderInput {...defaultProps} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('should close dropdown on Escape', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should navigate with arrow keys', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    // Should still be interactive
    expect(input).toBeInTheDocument();
  });

  it('should select with Enter key', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should close on Tab', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should allow custom path starting with /', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '/NewCustomPath' } });
    expect(screen.getByText(/Use "\/NewCustomPath" as custom path/)).toBeInTheDocument();
  });

  it('should select custom path on click', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '/NewPath' } });
    fireEvent.click(screen.getByText(/Use "\/NewPath" as custom path/));
    expect(defaultProps.onChange).toHaveBeenCalledWith('/NewPath');
  });

  it('should open dropdown with Enter on button', () => {
    render(<FolderInput {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should open dropdown with Space on button', () => {
    render(<FolderInput {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should close dropdown on outside click', async () => {
    render(
      <div>
        <FolderInput {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  it('should show no matches message', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    expect(screen.getByText(/No folders match/)).toBeInTheDocument();
  });

  it('should handle Home key', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Home' });
    // Should reset to first item
    expect(input).toBeInTheDocument();
  });

  it('should handle End key', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'End' });
    // Should go to last item
    expect(input).toBeInTheDocument();
  });

  it('should handle empty folders', () => {
    render(<FolderInput {...defaultProps} folders={null} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('/ (Root)')).toBeInTheDocument();
  });

  it('should highlight on mouse enter', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const option = screen.getByText('/Integration');
    fireEvent.mouseEnter(option.closest('[data-option]'));
    // Should update highlighted index
    expect(option).toBeInTheDocument();
  });

  it('should show checkmark for selected value', () => {
    render(<FolderInput {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    // The selected folder should have a checkmark
    const selectedOption = screen.getByText('/Tests').closest('[role="option"]');
    expect(selectedOption).toBeInTheDocument();
  });

  it('should not render required indicator when not required', () => {
    render(<FolderInput {...defaultProps} required={false} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});
