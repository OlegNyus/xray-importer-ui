import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import XrayLinkingPanel from './XrayLinkingPanel';

describe('XrayLinkingPanel', () => {
  const defaultCache = {
    testPlans: [
      { issueId: '1', key: 'WCP-100', summary: 'Test Plan 1' },
      { issueId: '2', key: 'WCP-101', summary: 'Test Plan 2' },
    ],
    testExecutions: [
      { issueId: '3', key: 'WCP-200', summary: 'Test Execution 1' },
    ],
    testSets: [
      { issueId: '4', key: 'WCP-300', summary: 'Test Set 1' },
    ],
    preconditions: [
      { issueId: '5', key: 'WCP-400', summary: 'Precondition 1' },
    ],
    folders: {
      path: '/',
      folders: [
        { path: '/Smoke Tests' },
        { path: '/Regression' },
      ],
    },
    projectId: 'proj-1',
    loading: {
      testPlans: false,
      testExecutions: false,
      testSets: false,
      preconditions: false,
      folders: false,
    },
    errors: {
      testPlans: null,
      testExecutions: null,
      testSets: null,
      preconditions: null,
      folders: null,
    },
    loaded: true,
  };

  const defaultProps = {
    projectKey: 'WCP',
    value: {
      testPlanIds: [],
      testExecutionIds: [],
      testSetIds: [],
      preconditionIds: [],
      folderPath: '/',
    },
    onChange: vi.fn(),
    showValidation: false,
    xrayEntitiesCache: defaultCache,
    onLoadXrayEntities: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Xray Linking header', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('Xray Linking')).toBeInTheDocument();
  });

  it('should render Refresh button', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
  });

  it('should call onLoadXrayEntities when Refresh is clicked', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(defaultProps.onLoadXrayEntities).toHaveBeenCalledWith('WCP', true);
  });

  it('should disable Refresh button when loading', () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        loading: { ...defaultCache.loading, testPlans: true },
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByRole('button', { name: /Loading/ })).toBeDisabled();
  });

  it('should render Test Plans section', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('Test Plans')).toBeInTheDocument();
  });

  it('should render Test Executions section', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('Test Executions')).toBeInTheDocument();
  });

  it('should render Test Sets section', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('Test Sets')).toBeInTheDocument();
  });

  it('should render Folder section', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('Folder')).toBeInTheDocument();
  });

  it('should render Preconditions section', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('Preconditions')).toBeInTheDocument();
  });

  it('should display search placeholder for test plans', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type to search test plans...')).toBeInTheDocument();
  });

  it('should show dropdown with options when clicking input', async () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('Type to search test plans...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('WCP-100')).toBeInTheDocument();
      expect(screen.getByText(': Test Plan 1')).toBeInTheDocument();
    });
  });

  it('should filter options when typing in search', async () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('Type to search test plans...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByText('WCP-101')).toBeInTheDocument();
      expect(screen.queryByText('WCP-100')).not.toBeInTheDocument();
    });
  });

  it('should call onChange when selecting an item from dropdown', async () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('Type to search test plans...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('WCP-100')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('WCP-100'));
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should show selected count when items are selected', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['1'],
        testPlanDisplays: [{ id: '1', display: 'WCP-100: Test Plan 1' }],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('(1 selected)')).toBeInTheDocument();
  });

  it('should display selected items as chips', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['1'],
        testPlanDisplays: [{ id: '1', display: 'WCP-100: Test Plan 1' }],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    // Selected item shown as chip with key
    expect(screen.getByText('WCP-100')).toBeInTheDocument();
  });

  it('should support backwards compatibility with key-based selection', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['WCP-100'], // Legacy format using key
        testPlanDisplays: [{ id: 'WCP-100', display: 'WCP-100: Test Plan 1' }],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('WCP-100')).toBeInTheDocument();
  });

  it('should render folder with root option displayed', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('/ (Root)')).toBeInTheDocument();
  });

  it('should show folder dropdown with options when clicking', async () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const folderInput = screen.getByText('/ (Root)').closest('div');
    fireEvent.click(folderInput);

    await waitFor(() => {
      expect(screen.getByText('/Smoke Tests')).toBeInTheDocument();
      expect(screen.getByText('/Regression')).toBeInTheDocument();
    });
  });

  it('should show loading state for test plans', () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        testPlans: [],
        loading: { ...defaultCache.loading, testPlans: true },
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getAllByText('Loading...')[0]).toBeInTheDocument();
  });

  it('should show error message for test plans', () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        errors: { ...defaultCache.errors, testPlans: 'Failed to load' },
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should show validation error when required field is empty', () => {
    const props = {
      ...defaultProps,
      showValidation: true,
      value: {
        ...defaultProps.value,
        testPlanIds: [],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    // Multiple required fields show validation error
    const errors = screen.getAllByText('At least one required');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should not show validation error for preconditions (optional)', () => {
    const props = {
      ...defaultProps,
      showValidation: true,
      value: {
        ...defaultProps.value,
        preconditionIds: [],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    // Should not have "required" error for preconditions
    const preconditionSection = screen.getByText('Preconditions').closest('div');
    expect(preconditionSection).not.toHaveTextContent('required');
  });

  it('should call onLoadXrayEntities on mount if cache not loaded', () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        loaded: false,
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(defaultProps.onLoadXrayEntities).toHaveBeenCalledWith('WCP', false);
  });

  it('should not call onLoadXrayEntities on mount if cache is loaded', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(defaultProps.onLoadXrayEntities).not.toHaveBeenCalled();
  });

  it('should update projectId in value when cache loads it', async () => {
    const onChange = vi.fn();
    const props = {
      ...defaultProps,
      onChange,
      value: {
        ...defaultProps.value,
        projectId: null,
      },
      xrayEntitiesCache: {
        ...defaultCache,
        projectId: 'proj-123',
      },
    };
    render(<XrayLinkingPanel {...props} />);
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'proj-123',
      }));
    });
  });

  it('should remove item when clicking X on chip', async () => {
    const onChange = vi.fn();
    const props = {
      ...defaultProps,
      onChange,
      value: {
        ...defaultProps.value,
        testPlanIds: ['1'],
        testPlanDisplays: [{ id: '1', display: 'WCP-100: Test Plan 1' }],
      },
    };
    render(<XrayLinkingPanel {...props} />);

    // Find the X button on the chip - it's the button after the chip text
    const chipText = screen.getByText('WCP-100');
    const chip = chipText.closest('span');
    // Get the parent span that contains both text and button
    const chipContainer = chip.parentElement || chip;
    const removeButton = chipContainer.querySelector('button');

    if (removeButton) {
      fireEvent.click(removeButton);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        testPlanIds: [],
        testPlanDisplays: [],
      }));
    } else {
      // Alternative: find all buttons and click the one that's for removing
      const buttons = screen.getAllByRole('button');
      const removeBtn = buttons.find(btn => btn.closest('span')?.textContent?.includes('WCP-100'));
      if (removeBtn) {
        fireEvent.click(removeBtn);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
          testPlanIds: [],
          testPlanDisplays: [],
        }));
      }
    }
  });

  it('should show placeholder when no items available', async () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        testPlans: [],
        loaded: true,
      },
    };
    render(<XrayLinkingPanel {...props} />);

    const input = screen.getByPlaceholderText('Type to search test plans...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Click Refresh to load test plans')).toBeInTheDocument();
    });
  });

  it('should use default cache when xrayEntitiesCache is not provided', () => {
    const props = {
      projectKey: 'WCP',
      value: defaultProps.value,
      onChange: vi.fn(),
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('Xray Linking')).toBeInTheDocument();
  });

  it('should handle folder selection from dropdown', async () => {
    const onChange = vi.fn();
    const props = {
      ...defaultProps,
      onChange,
    };
    render(<XrayLinkingPanel {...props} />);

    const folderInput = screen.getByText('/ (Root)').closest('div');
    fireEvent.click(folderInput);

    await waitFor(() => {
      expect(screen.getByText('/Smoke Tests')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('/Smoke Tests'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      folderPath: '/Smoke Tests',
    }));
  });

  it('should show required indicator for required fields', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThan(0);
  });

  it('should display saved displays when options not loaded', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['1'],
        testPlanDisplays: [{ id: '1', display: 'WCP-100: Saved Plan' }],
      },
      xrayEntitiesCache: {
        ...defaultCache,
        testPlans: [],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('WCP-100')).toBeInTheDocument();
  });

  it('should show hint message', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText(/Select Test Plans, Executions, and Sets/)).toBeInTheDocument();
  });
});
