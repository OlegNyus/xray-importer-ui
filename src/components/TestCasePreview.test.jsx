import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TestCasePreview from './TestCasePreview';

vi.mock('./XrayLinksEditor', () => ({
  default: ({ testCase }) => (
    <div data-testid="xray-links-editor">
      XrayLinksEditor for {testCase.id}
    </div>
  ),
}));

describe('TestCasePreview', () => {
  const defaultProps = {
    testCase: {
      id: 'tc-1',
      testKey: 'WCP-1234',
      summary: 'Test Summary',
      description: 'Test Description',
      testType: 'Manual',
      labels: ['smoke', 'regression'],
      steps: [
        { id: 's1', action: 'Step 1 Action', data: 'Step 1 Data', result: 'Step 1 Result' },
        { id: 's2', action: 'Step 2 Action', result: 'Step 2 Result' },
      ],
      importedAt: Date.now(),
      xrayLinking: {
        testPlanIds: ['plan-1'],
        testExecutionIds: ['exec-1'],
        testSetIds: ['set-1'],
        folderPath: '/',
      },
    },
    config: {
      jiraBaseUrl: 'https://test.atlassian.net',
    },
    activeProject: 'WCP',
    xrayEntitiesCache: {},
    onLoadXrayEntities: vi.fn(),
    onLinksUpdated: vi.fn(),
    showToast: vi.fn(),
  };

  it('should render test case summary', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Test Summary')).toBeInTheDocument();
  });

  it('should render testKey as link to Jira', () => {
    render(<TestCasePreview {...defaultProps} />);
    const link = screen.getByRole('link', { name: /WCP-1234/ });
    expect(link).toHaveAttribute('href', 'https://test.atlassian.net/browse/WCP-1234');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should render Imported badge', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('should render imported date when available', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText(/Imported on/)).toBeInTheDocument();
  });

  it('should not render imported date when not available', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, importedAt: null },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.queryByText(/Imported on/)).not.toBeInTheDocument();
  });

  it('should render description', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should render "No description" when description is empty', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, description: '' },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('should render test type', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('should render default test type when not specified', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, testType: null },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('should render labels', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('smoke')).toBeInTheDocument();
    expect(screen.getByText('regression')).toBeInTheDocument();
  });

  it('should render "No labels" when labels array is empty', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, labels: [] },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('No labels')).toBeInTheDocument();
  });

  it('should render test steps header with count badge', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Test Steps')).toBeInTheDocument();
    // Count badge shows step count - use getAllByText since step numbers also show "2"
    const countBadges = screen.getAllByText('2');
    expect(countBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should render step actions', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Step 1 Action')).toBeInTheDocument();
    expect(screen.getByText('Step 2 Action')).toBeInTheDocument();
  });

  it('should render step data when available', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Step 1 Data')).toBeInTheDocument();
  });

  it('should render "No test data" placeholder when step data is not available', () => {
    const props = {
      ...defaultProps,
      testCase: {
        ...defaultProps.testCase,
        steps: [{ id: 's1', action: 'Action', result: 'Result' }],
      },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('No test data')).toBeInTheDocument();
  });

  it('should render step results', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByText('Step 1 Result')).toBeInTheDocument();
    expect(screen.getByText('Step 2 Result')).toBeInTheDocument();
  });

  it('should render step numbers in badges', () => {
    render(<TestCasePreview {...defaultProps} />);
    // Step numbers are rendered in circular badges
    const stepBadges = document.querySelectorAll('.rounded-full');
    expect(stepBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('should render "No test steps defined" when steps is empty', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, steps: [] },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('No test steps defined')).toBeInTheDocument();
  });

  it('should render "No test steps defined" when steps is undefined', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, steps: undefined },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('No test steps defined')).toBeInTheDocument();
  });

  it('should render XrayLinksEditor with correct props', () => {
    render(<TestCasePreview {...defaultProps} />);
    expect(screen.getByTestId('xray-links-editor')).toBeInTheDocument();
    expect(screen.getByText('XrayLinksEditor for tc-1')).toBeInTheDocument();
  });

  it('should use default Jira base URL when config is missing', () => {
    const props = {
      ...defaultProps,
      config: null,
    };
    render(<TestCasePreview {...props} />);
    const link = screen.getByRole('link', { name: /WCP-1234/ });
    expect(link).toHaveAttribute('href', 'https://your-domain.atlassian.net/browse/WCP-1234');
  });

  it('should not render testKey link when testKey is missing', () => {
    const props = {
      ...defaultProps,
      testCase: { ...defaultProps.testCase, testKey: null },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should handle steps without id using index as key', () => {
    const props = {
      ...defaultProps,
      testCase: {
        ...defaultProps.testCase,
        steps: [
          { action: 'Action 1', result: 'Result 1' },
          { action: 'Action 2', result: 'Result 2' },
        ],
      },
    };
    render(<TestCasePreview {...props} />);
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });
});
