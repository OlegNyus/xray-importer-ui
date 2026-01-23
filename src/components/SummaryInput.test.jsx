import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SummaryInput from './SummaryInput';
import * as api from '../utils/api';

vi.mock('../utils/api');

// Mock scrollIntoView since jsdom doesn't implement it
Element.prototype.scrollIntoView = vi.fn();

describe('SummaryInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    error: null,
    editingId: null,
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchFunctionalAreas.mockResolvedValue({ success: true, areas: ['Area1', 'Area2', 'Area3'] });
    api.saveFunctionalAreas.mockResolvedValue({ success: true });
  });

  // Helper to open the functional area dropdown
  function openDropdown() {
    const summaryLabel = screen.getByText('Summary');
    const areaSection = summaryLabel.closest('.space-y-3').querySelector('.relative');
    const field = areaSection.querySelector('.input');
    fireEvent.click(field);
  }

  it('should render Summary label', async () => {
    render(<SummaryInput {...defaultProps} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('should render placeholder when no area selected and closed', async () => {
    render(<SummaryInput {...defaultProps} />);
    expect(screen.getByText('Search or create...')).toBeInTheDocument();
  });

  it('should load functional areas on mount', async () => {
    render(<SummaryInput {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalledTimes(1);
    });
  });

  it('should show search input when opened', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search or create...')).toBeInTheDocument();
    });
  });

  it('should show dropdown with areas when opened', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
      expect(screen.getByText('Area2')).toBeInTheDocument();
    });
  });

  it('should select area from dropdown', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Area1'));
    expect(onChange).toHaveBeenCalledWith('Area1 | UI');
  });

  it('should build summary with area, layer and title', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    // Select area
    openDropdown();
    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Area1'));

    // Type title
    const titleInput = screen.getByPlaceholderText('Test case title');
    fireEvent.change(titleInput, { target: { value: 'My Test' } });

    expect(onChange).toHaveBeenLastCalledWith('Area1 | UI | My Test');
  });

  it('should toggle layer between UI and API', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} value="Area1" />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    const apiButton = screen.getByText('API');
    fireEvent.click(apiButton);

    // Should include API in the summary
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('should parse existing value with 3 parts', async () => {
    render(<SummaryInput {...defaultProps} value="TestArea | API | Test Title" />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('TestArea')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument();
    });
  });

  it('should show preview when area or title is set', async () => {
    render(<SummaryInput {...defaultProps} value="Area1 | UI | Test" />);

    await waitFor(() => {
      expect(screen.getByText('Area1 | UI | Test')).toBeInTheDocument();
    });
  });

  it('should create new area by typing and pressing Enter', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search or create...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewArea' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(api.saveFunctionalAreas).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith('NewArea | UI');
    });
  });

  it('should show Create option for new areas', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewArea' } });

    await waitFor(() => {
      const createOption = screen.getByText('NewArea', { selector: '.font-medium' });
      expect(createOption).toBeInTheDocument();
    });
  });

  it('should close dropdown on outside click', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <SummaryInput {...defaultProps} />
      </div>
    );

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Area1')).not.toBeInTheDocument();
    });
  });

  it('should close dropdown on Escape', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'A' } });

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Area1')).not.toBeInTheDocument();
    });
  });

  it('should filter areas based on input', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'Area1' } });

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
      expect(screen.queryByText('Area2')).not.toBeInTheDocument();
    });
  });

  it('should show error when error prop is set and no area/title', async () => {
    render(<SummaryInput {...defaultProps} error="Summary is required" />);

    await waitFor(() => {
      expect(screen.getByText('Summary is required')).toBeInTheDocument();
    });
  });

  it('should be disabled when disabled prop is true', async () => {
    render(<SummaryInput {...defaultProps} disabled={true} />);

    const titleInput = screen.getByPlaceholderText('Test case title');
    expect(titleInput).toBeDisabled();
  });

  it('should reset when value becomes empty', async () => {
    const { rerender } = render(<SummaryInput {...defaultProps} value="Area1 | UI | Test" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    rerender(<SummaryInput {...defaultProps} value="" />);

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Test')).not.toBeInTheDocument();
    });
  });

  it('should handle fetch areas error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.fetchFunctionalAreas.mockRejectedValueOnce(new Error('Network error'));

    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load functional areas:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle save areas error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.saveFunctionalAreas.mockRejectedValueOnce(new Error('Network error'));

    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.change(input, { target: { value: 'NewArea' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save functional areas:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should select area with keyboard navigation', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');

    // Navigate down and select
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Area1 | UI');
  });

  it('should clear selected area on Backspace when input is empty', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} value="Area1 | UI | Test" />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    // Wait for value to be parsed
    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });

    openDropdown();
    const input = screen.getByPlaceholderText('Search or create...');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith('Test');
  });

  it('should show chevron that rotates when open', async () => {
    render(<SummaryInput {...defaultProps} />);

    const summaryLabel = screen.getByText('Summary');
    const areaSection = summaryLabel.closest('.space-y-3').querySelector('.relative');
    const chevron = areaSection.querySelector('svg.transition-transform');
    expect(chevron).not.toHaveClass('rotate-180');

    openDropdown();

    await waitFor(() => {
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  it('should highlight field when open', async () => {
    render(<SummaryInput {...defaultProps} />);

    const summaryLabel = screen.getByText('Summary');
    const areaSection = summaryLabel.closest('.space-y-3').querySelector('.relative');
    const field = areaSection.querySelector('.input');
    expect(field).not.toHaveClass('ring-2');

    openDropdown();

    await waitFor(() => {
      expect(field).toHaveClass('ring-2');
    });
  });

  it('should show hint to create when list is shown but nothing typed', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    openDropdown();

    await waitFor(() => {
      expect(screen.getByText('Type to create a new area')).toBeInTheDocument();
    });
  });
});
