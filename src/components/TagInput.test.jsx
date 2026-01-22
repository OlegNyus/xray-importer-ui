import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TagInput from './TagInput';
import * as api from '../utils/api';

vi.mock('../utils/api');

describe('TagInput', () => {
  const defaultProps = {
    tags: [],
    onChange: vi.fn(),
    placeholder: 'Add labels...',
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchLabels.mockResolvedValue({ success: true, labels: ['Label1', 'Label2', 'Label3'] });
    api.saveLabels.mockResolvedValue({ success: true });
  });

  it('should render placeholder when no tags', async () => {
    render(<TagInput {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add labels...')).toBeInTheDocument();
    });
  });

  it('should not render placeholder when has tags', async () => {
    render(<TagInput {...defaultProps} tags={['ExistingTag']} />);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Add labels...')).not.toBeInTheDocument();
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
    // Find the remove button inside the first tag
    const firstRemoveBtn = removeButtons.find(btn => btn.closest('.tag'));
    fireEvent.click(firstRemoveBtn);

    expect(onChange).toHaveBeenCalledWith(['Tag2']);
  });

  it('should add tag on Enter key', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.change(input, { target: { value: 'NewTag' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['NewTag']);
  });

  it('should not add duplicate tags', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} tags={['ExistingTag']} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'ExistingTag' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should remove last tag on Backspace when input is empty', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} tags={['Tag1', 'Tag2']} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['Tag1']);
  });

  it('should close dropdown on Escape', async () => {
    render(<TagInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.focus(input);
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

  it('should show dropdown on input focus', async () => {
    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.focus(input);
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

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.focus(input);
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

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Label1' } });

    await waitFor(() => {
      expect(screen.getByText('Label1')).toBeInTheDocument();
      expect(screen.queryByText('Label2')).not.toBeInTheDocument();
    });
  });

  it('should show Add new option for new labels', async () => {
    render(<TagInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'NewLabel' } });

    await waitFor(() => {
      expect(screen.getByText('Add "NewLabel"')).toBeInTheDocument();
    });
  });

  it('should save new label to server when added', async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchLabels).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Add labels...');
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

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.focus(input);
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

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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

    const input = screen.getByPlaceholderText('Add labels...');
    fireEvent.change(input, { target: { value: 'NewLabel' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save labels:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
