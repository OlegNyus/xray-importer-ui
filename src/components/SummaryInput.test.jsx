import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SummaryInput from './SummaryInput';
import * as api from '../utils/api';

vi.mock('../utils/api');

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

  it('should render Summary label', async () => {
    render(<SummaryInput {...defaultProps} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('should load functional areas on mount', async () => {
    render(<SummaryInput {...defaultProps} />);
    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalledTimes(1);
    });
  });

  it('should show dropdown when area button is clicked', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Select...'));

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });
  });

  it('should select area from dropdown', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Select...'));

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Area1'));
    expect(onChange).toHaveBeenCalledWith('Area1');
  });

  it('should build summary with area, layer and title', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    // Select area
    fireEvent.click(screen.getByText('Select...'));
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

  it('should add new area', async () => {
    const onChange = vi.fn();
    render(<SummaryInput {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    // Open dropdown
    fireEvent.click(screen.getByText('Select...'));

    await waitFor(() => {
      expect(screen.getByText('Add new area')).toBeInTheDocument();
    });

    // Click add new
    fireEvent.click(screen.getByText('Add new area'));

    // Type new area name
    const newAreaInput = screen.getByPlaceholderText('New area name');
    fireEvent.change(newAreaInput, { target: { value: 'NewArea' } });

    // Click Add button
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(api.saveFunctionalAreas).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith('NewArea');
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

    fireEvent.click(screen.getByText('Select...'));

    await waitFor(() => {
      expect(screen.getByText('Area1')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Area1')).not.toBeInTheDocument();
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

    const areaButton = screen.getByText('Select...').closest('button');
    expect(areaButton).toBeDisabled();

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

    fireEvent.click(screen.getByText('Select...'));

    await waitFor(() => {
      expect(screen.getByText('Add new area')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add new area'));
    const newAreaInput = screen.getByPlaceholderText('New area name');
    fireEvent.change(newAreaInput, { target: { value: 'NewArea' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save functional areas:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should add new area on Enter key', async () => {
    render(<SummaryInput {...defaultProps} />);

    await waitFor(() => {
      expect(api.fetchFunctionalAreas).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Select...'));
    fireEvent.click(screen.getByText('Add new area'));

    const newAreaInput = screen.getByPlaceholderText('New area name');
    fireEvent.change(newAreaInput, { target: { value: 'NewArea' } });
    fireEvent.keyDown(newAreaInput, { key: 'Enter' });

    await waitFor(() => {
      expect(api.saveFunctionalAreas).toHaveBeenCalled();
    });
  });
});
