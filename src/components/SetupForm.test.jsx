import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupForm from './SetupForm';
import * as api from '../utils/api';

vi.mock('../utils/api');

describe('SetupForm', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Welcome to RayDrop title', () => {
    render(<SetupForm onComplete={mockOnComplete} />);
    expect(screen.getByText('Welcome to RayDrop')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<SetupForm onComplete={mockOnComplete} />);
    expect(screen.getByText('Configure your Xray Cloud credentials to get started')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<SetupForm onComplete={mockOnComplete} />);
    expect(screen.getByPlaceholderText('Enter your Xray Client ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your Xray Client Secret')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://your-domain.atlassian.net/')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. PROJ')).toBeInTheDocument();
  });

  it('should have empty values on first run (no initialConfig)', () => {
    render(<SetupForm onComplete={mockOnComplete} />);
    expect(screen.getByPlaceholderText('https://your-domain.atlassian.net/')).toHaveValue('');
    expect(screen.getByPlaceholderText('e.g. PROJ')).toHaveValue('');
  });

  it('should use initialConfig values when provided', () => {
    const initialConfig = {
      jiraBaseUrl: 'https://custom.atlassian.net/',
      projectKey: 'PROJ',
    };
    render(<SetupForm onComplete={mockOnComplete} initialConfig={initialConfig} />);
    expect(screen.getByPlaceholderText('https://your-domain.atlassian.net/')).toHaveValue('https://custom.atlassian.net/');
    expect(screen.getByPlaceholderText('e.g. PROJ')).toHaveValue('PROJ');
  });

  it('should update form values on change', () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    fireEvent.change(clientIdInput, { target: { value: 'test-client-id', name: 'xrayClientId' } });
    expect(clientIdInput).toHaveValue('test-client-id');
  });

  it('should force uppercase and remove non-letters for projectKey', () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const projectKeyInput = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(projectKeyInput, { target: { value: 'abc123', name: 'projectKey' } });
    expect(projectKeyInput).toHaveValue('ABC');
  });

  it('should show error when Client ID is empty', async () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Client ID is required')).toBeInTheDocument();
    });
  });

  it('should show error when Client Secret is empty', async () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Client Secret is required')).toBeInTheDocument();
    });
  });

  it('should show error when Jira Base URL is empty', async () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const urlInput = screen.getByPlaceholderText('https://your-domain.atlassian.net/');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(urlInput, { target: { value: '', name: 'jiraBaseUrl' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Jira Base URL is required')).toBeInTheDocument();
    });
  });

  // URL format validation is tested implicitly through integration
  // The URL constructor throws for invalid URLs, and this is validated on the server as well

  it('should show error when Project Key is empty', async () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const keyInput = screen.getByPlaceholderText('e.g. PROJ');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(keyInput, { target: { value: '', name: 'projectKey' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Project Key is required')).toBeInTheDocument();
    });
  });

  it('should clear error when user types', async () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Client ID is required')).toBeInTheDocument();
    });

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    fireEvent.change(clientIdInput, { target: { value: 'test', name: 'xrayClientId' } });

    expect(screen.queryByText('Client ID is required')).not.toBeInTheDocument();
  });

  it('should call saveConfig and onComplete on successful submission', async () => {
    api.saveConfig.mockResolvedValueOnce({ success: true });

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const urlInput = screen.getByPlaceholderText('https://your-domain.atlassian.net/');
    const keyInput = screen.getByPlaceholderText('e.g. PROJ');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(urlInput, { target: { value: 'https://test.atlassian.net/', name: 'jiraBaseUrl' } });
    fireEvent.change(keyInput, { target: { value: 'TEST', name: 'projectKey' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(api.saveConfig).toHaveBeenCalledWith({
        xrayClientId: 'test-id',
        xrayClientSecret: 'test-secret',
        jiraBaseUrl: 'https://test.atlassian.net/',
        projectKey: 'TEST',
      });
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show loading state during submission', async () => {
    api.saveConfig.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const urlInput = screen.getByPlaceholderText('https://your-domain.atlassian.net/');
    const keyInput = screen.getByPlaceholderText('e.g. PROJ');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(urlInput, { target: { value: 'https://test.atlassian.net/', name: 'jiraBaseUrl' } });
    fireEvent.change(keyInput, { target: { value: 'TEST', name: 'projectKey' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    expect(await screen.findByText('Validating...')).toBeInTheDocument();
  });

  it('should show error when saveConfig returns failure', async () => {
    api.saveConfig.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const urlInput = screen.getByPlaceholderText('https://your-domain.atlassian.net/');
    const keyInput = screen.getByPlaceholderText('e.g. PROJ');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(urlInput, { target: { value: 'https://test.atlassian.net/', name: 'jiraBaseUrl' } });
    fireEvent.change(keyInput, { target: { value: 'TEST', name: 'projectKey' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should show generic error when saveConfig returns failure without message', async () => {
    api.saveConfig.mockResolvedValueOnce({ success: false });

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const urlInput = screen.getByPlaceholderText('https://your-domain.atlassian.net/');
    const keyInput = screen.getByPlaceholderText('e.g. PROJ');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(urlInput, { target: { value: 'https://test.atlassian.net/', name: 'jiraBaseUrl' } });
    fireEvent.change(keyInput, { target: { value: 'TEST', name: 'projectKey' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save configuration')).toBeInTheDocument();
    });
  });

  it('should show error when saveConfig throws', async () => {
    api.saveConfig.mockRejectedValueOnce(new Error('Network error'));

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');
    const urlInput = screen.getByPlaceholderText('https://your-domain.atlassian.net/');
    const keyInput = screen.getByPlaceholderText('e.g. PROJ');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });
    fireEvent.change(urlInput, { target: { value: 'https://test.atlassian.net/', name: 'jiraBaseUrl' } });
    fireEvent.change(keyInput, { target: { value: 'TEST', name: 'projectKey' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      // Now displays the actual error message from the exception
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // Edit mode tests
  describe('Edit mode', () => {
    const mockOnCancel = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should show Edit Configuration title when isEditing is true', () => {
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={true} />);
      expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
      expect(screen.queryByText('Welcome to RayDrop')).not.toBeInTheDocument();
    });

    it('should show update description when editing', () => {
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={true} />);
      expect(screen.getByText('Update your Xray Cloud credentials')).toBeInTheDocument();
    });

    it('should show Cancel button when editing', () => {
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={true} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should not show Cancel button when not editing', () => {
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={false} />);
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('should call onCancel when Cancel button is clicked', () => {
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={true} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show Update Configuration button text when editing', () => {
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={true} />);
      expect(screen.getByRole('button', { name: 'Update Configuration' })).toBeInTheDocument();
    });

    it('should pre-fill credentials from initialConfig when editing', () => {
      const initialConfig = {
        xrayClientId: 'my-client-id',
        xrayClientSecret: 'my-secret',
        jiraBaseUrl: 'https://test.atlassian.net/',
        projectKey: 'TEST',
      };
      render(<SetupForm onComplete={mockOnComplete} onCancel={mockOnCancel} isEditing={true} initialConfig={initialConfig} />);
      expect(screen.getByPlaceholderText('Enter your Xray Client ID')).toHaveValue('my-client-id');
      expect(screen.getByPlaceholderText('Enter your Xray Client Secret')).toHaveValue('my-secret');
    });
  });
});
