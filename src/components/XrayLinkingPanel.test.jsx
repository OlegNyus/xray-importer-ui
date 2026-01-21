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

  it('should display test plan options', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    expect(screen.getByText('WCP-100: Test Plan 1')).toBeInTheDocument();
    expect(screen.getByText('WCP-101: Test Plan 2')).toBeInTheDocument();
  });

  it('should call onChange when selecting a test plan', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should show selected count when items are selected', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['1'],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('(1 selected)')).toBeInTheDocument();
  });

  it('should check checkbox for selected items', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['1'],
      },
    };
    render(<XrayLinkingPanel {...props} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
  });

  it('should support backwards compatibility with key-based selection', () => {
    const props = {
      ...defaultProps,
      value: {
        ...defaultProps.value,
        testPlanIds: ['WCP-100'], // Legacy format using key
      },
    };
    render(<XrayLinkingPanel {...props} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
  });

  it('should render folder dropdown with options', () => {
    render(<XrayLinkingPanel {...defaultProps} />);
    const folderSelect = screen.getByRole('combobox');
    expect(folderSelect).toBeInTheDocument();
    expect(screen.getByText('/ (Root)')).toBeInTheDocument();
    expect(screen.getByText('/Smoke Tests')).toBeInTheDocument();
    expect(screen.getByText('/Regression')).toBeInTheDocument();
  });

  it('should show folder text input when no folders loaded', () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        folders: null,
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByPlaceholderText('/path/to/folder')).toBeInTheDocument();
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

  it('should deselect item when clicking selected checkbox', () => {
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
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      testPlanIds: [],
      testPlanDisplays: [],
    }));
  });

  it('should show placeholder when no items available', () => {
    const props = {
      ...defaultProps,
      xrayEntitiesCache: {
        ...defaultCache,
        testPlans: [],
        loaded: true,
      },
    };
    render(<XrayLinkingPanel {...props} />);
    expect(screen.getByText('Click Refresh to load options')).toBeInTheDocument();
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

  it('should handle folder path change', () => {
    const onChange = vi.fn();
    const props = {
      ...defaultProps,
      onChange,
    };
    render(<XrayLinkingPanel {...props} />);
    const folderSelect = screen.getByRole('combobox');
    fireEvent.change(folderSelect, { target: { value: '/Smoke Tests' } });
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
    expect(screen.getByText('WCP-100: Saved Plan')).toBeInTheDocument();
  });
});
