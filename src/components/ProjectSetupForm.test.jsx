import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectSetupForm from './ProjectSetupForm';

// Mock the API
vi.mock('../utils/api', () => ({
  addProject: vi.fn(),
}));

import { addProject } from '../utils/api';

describe('ProjectSetupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onComplete: vi.fn(),
    onCancel: vi.fn(),
    isFirstProject: true,
  };

  it('should render form with title for first project', () => {
    render(<ProjectSetupForm {...defaultProps} />);

    expect(screen.getByText('Add Your First Project')).toBeInTheDocument();
    expect(screen.getByText(/Enter the Jira project key where test cases will be imported/)).toBeInTheDocument();
  });

  it('should render form with title for additional project', () => {
    render(<ProjectSetupForm {...defaultProps} isFirstProject={false} />);

    expect(screen.getByRole('heading', { name: 'Add Project' })).toBeInTheDocument();
    expect(screen.getByText(/Enter a new Jira project key/)).toBeInTheDocument();
  });

  it('should show Cancel button for additional projects', () => {
    render(<ProjectSetupForm {...defaultProps} isFirstProject={false} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should not show Cancel button for first project', () => {
    render(<ProjectSetupForm {...defaultProps} isFirstProject={true} />);

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should call onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<ProjectSetupForm {...defaultProps} isFirstProject={false} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should convert input to uppercase and remove non-letters', () => {
    render(<ProjectSetupForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'abc123xyz' } });

    expect(input.value).toBe('ABCXYZ');
  });

  it('should disable submit button when project key is empty', () => {
    render(<ProjectSetupForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Add Project' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when project key has value', () => {
    render(<ProjectSetupForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'TEST' } });

    const submitButton = screen.getByRole('button', { name: 'Add Project' });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call addProject API on valid submission', async () => {
    addProject.mockResolvedValue({ success: true });

    render(<ProjectSetupForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'MYPROJ' } });

    const submitButton = screen.getByText('Add Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(addProject).toHaveBeenCalledWith('MYPROJ', expect.any(String));
    });
  });

  it('should call onComplete on successful submission', async () => {
    const onComplete = vi.fn();
    addProject.mockResolvedValue({ success: true, alreadyExists: false });

    render(<ProjectSetupForm {...defaultProps} onComplete={onComplete} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'NEWPROJ' } });

    fireEvent.click(screen.getByText('Add Project'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('NEWPROJ', false);
    });
  });

  it('should pass alreadyExists flag to onComplete', async () => {
    const onComplete = vi.fn();
    addProject.mockResolvedValue({ success: true, alreadyExists: true });

    render(<ProjectSetupForm {...defaultProps} onComplete={onComplete} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'EXISTING' } });

    fireEvent.click(screen.getByText('Add Project'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('EXISTING', true);
    });
  });

  it('should show error on API failure', async () => {
    addProject.mockResolvedValue({ success: false, error: 'API Error' });

    render(<ProjectSetupForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'FAIL' } });

    fireEvent.click(screen.getByText('Add Project'));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should show error on API exception', async () => {
    addProject.mockRejectedValue(new Error('Network error'));

    render(<ProjectSetupForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'ERROR' } });

    fireEvent.click(screen.getByText('Add Project'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    addProject.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProjectSetupForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'LOADING' } });

    fireEvent.click(screen.getByText('Add Project'));

    await waitFor(() => {
      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });
  });

  it('should render color picker', () => {
    render(<ProjectSetupForm {...defaultProps} />);

    expect(screen.getByText('Project Color')).toBeInTheDocument();
  });

  it('should show helper text', () => {
    render(<ProjectSetupForm {...defaultProps} />);

    expect(screen.getByText(/Uppercase letters only/)).toBeInTheDocument();
  });
});
