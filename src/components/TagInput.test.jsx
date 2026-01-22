import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TagInput from './TagInput';
import * as api from '../utils/api';

vi.mock('../utils/api');

describe('TagInput', () => {
  const defaultProps = {
    tags: [],
    onChange: vi.fn(),
    placeholder: 'Select labels...',
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchLabels.mockResolvedValue({ success: true, labels: ['Label1', 'Label2', 'Label3'] });
    api.saveLabels.mockResolvedValue({ success: true });
  });

  // Helper to open the dropdown
  function openDropdown() {
    const field = document.querySelector('.input');
    fireEvent.click(field);
  }

  it('should render placeholder when no tags and closed', async () => {
    render(<TagInput {...defaultProps} />);
    expect(screen.getByText('Select labels...')).toBeInTheDocument();
  });

  it('should show search input when opened', async () => {
    render(<TagInput {...defaultProps} />);
    openDropdown();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search or create...')).toBeInTheDocument();
    });
  });

  it('should render existing tags', async () => {
    render(<TagInput {...defaultProps} tags={['Tag1', 'Tag2']} />);
    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText('Tag2')).toBeInTheDocument();
  });

  it('should load labels from server on mount', async () => {
    render(<TagInput {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onChange when removing a tag', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} tags={['Tag1', 'Tag2']} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button');
    const firstRemoveBtn = removeButtons.find(btn => btn.closest('.tag'));
    fireEvent.click(firstRemoveBtn);

    expect(onChange).toHaveBeenCalledWith(['Tag2']);
  });

  it('should add tag on Enter key', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    openDropdown();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search or create...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewTag' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['NewTag']);
  });

  it('should not add duplicate tags', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} tags={['ExistingTag']} onChange={onChange} />);

    openDropdown();
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'ExistingTag' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should remove last tag on Backspace when input is empty', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} tags={['Tag1', 'Tag2']} onChange={onChange} />);

    openDropdown();
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['Tag1']);
  });

  it('should close dropdown on Escape', async () => {
    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'Lab' } });

    // Dropdown should be visible
    await waitFor(() => {
      expect(screen.queryByText('Label1')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    // Dropdown should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Label1')).not.toBeInTheDocument();
    });
  });

  it('should show dropdown when field is clicked', async () => {
    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'L' } });

    await waitFor(() => {
      expect(screen.getByText('Label1')).toBeInTheDocument();
    });
  });

  it('should select label from dropdown', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'Label' } });

    await waitFor(() => {
      expect(screen.getByText('Label1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Label1'));
    expect(onChange).toHaveBeenCalledWith(['Label1']);
  });

  it('should filter labels based on input', async () => {
    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'Label1' } });

    await waitFor(() => {
      expect(screen.getByText('Label1')).toBeInTheDocument();
      expect(screen.queryByText('Label2')).not.toBeInTheDocument();
    });
  });

  it('should show Create option for new labels', async () => {
    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewLabel' } });

    await waitFor(() => {
      const createOption = screen.getByText('NewLabel', { selector: '.font-medium' });
      expect(createOption).toBeInTheDocument();
    });
  });

  it('should save new label to server when added', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewLabel' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(api.saveLabels).toHaveBeenCalled();
    });
  });

  it('should close dropdown on outside click', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <TagInput {...defaultProps} />
      </div>
    );

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'L' } });

    await waitFor(() => {
      expect(screen.getByText('Label1')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Label1')).not.toBeInTheDocument();
    });
  });

  it('should be disabled when disabled prop is true', async () => {
    render(<TagInput {...defaultProps} disabled={true} tags={['Tag1']} />);

    // Input should not be visible when disabled
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    // Tag remove buttons should not be visible
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should handle fetch labels error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.fetchLabels.mockRejectedValueOnce(new Error('Network error'));

    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load labels:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle save labels error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.saveLabels.mockRejectedValueOnce(new Error('Network error'));

    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewLabel' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save labels:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should show chevron that rotates when open', async () => {
    render(<TagInput {...defaultProps} />);

    const chevron = document.querySelector('svg.transition-transform');
    expect(chevron).not.toHaveClass('rotate-180');

    openDropdown();

    await waitFor(() => {
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  it('should highlight field when open', async () => {
    render(<TagInput {...defaultProps} />);

    const field = document.querySelector('.input');
    expect(field).not.toHaveClass('ring-2');

    openDropdown();

    await waitFor(() => {
      expect(field).toHaveClass('ring-2');
    });
  });
});
