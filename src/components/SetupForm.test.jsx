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
    expect(screen.getByPlaceholderText('e.g. WCP')).toBeInTheDocument();
  });

  it('should have default values for jiraBaseUrl and projectKey', () => {
    render(<SetupForm onComplete={mockOnComplete} />);
    expect(screen.getByPlaceholderText('https://your-domain.atlassian.net/')).toHaveValue('https://whelen.atlassian.net/');
    expect(screen.getByPlaceholderText('e.g. WCP')).toHaveValue('WCP');
  });

  it('should use initialConfig values when provided', () => {
    const initialConfig = {
      jiraBaseUrl: 'https://custom.atlassian.net/',
      projectKey: 'PROJ',
    };
    render(<SetupForm onComplete={mockOnComplete} initialConfig={initialConfig} />);
    expect(screen.getByPlaceholderText('https://your-domain.atlassian.net/')).toHaveValue('https://custom.atlassian.net/');
    expect(screen.getByPlaceholderText('e.g. WCP')).toHaveValue('PROJ');
  });

  it('should update form values on change', () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    fireEvent.change(clientIdInput, { target: { value: 'test-client-id', name: 'xrayClientId' } });
    expect(clientIdInput).toHaveValue('test-client-id');
  });

  it('should force uppercase and remove non-letters for projectKey', () => {
    render(<SetupForm onComplete={mockOnComplete} />);

    const projectKeyInput = screen.getByPlaceholderText('e.g. WCP');
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
    const keyInput = screen.getByPlaceholderText('e.g. WCP');

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

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(api.saveConfig).toHaveBeenCalledWith({
        xrayClientId: 'test-id',
        xrayClientSecret: 'test-secret',
        jiraBaseUrl: 'https://whelen.atlassian.net/',
        projectKey: 'WCP',
      });
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show loading state during submission', async () => {
    api.saveConfig.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    expect(await screen.findByText('Validating...')).toBeInTheDocument();
  });

  it('should show error when saveConfig returns failure', async () => {
    api.saveConfig.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });

    render(<SetupForm onComplete={mockOnComplete} />);

    const clientIdInput = screen.getByPlaceholderText('Enter your Xray Client ID');
    const secretInput = screen.getByPlaceholderText('Enter your Xray Client Secret');

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });

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

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });

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

    fireEvent.change(clientIdInput, { target: { value: 'test-id', name: 'xrayClientId' } });
    fireEvent.change(secretInput, { target: { value: 'test-secret', name: 'xrayClientSecret' } });

    fireEvent.click(screen.getByText('Validate & Save Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save configuration')).toBeInTheDocument();
    });
  });
});
