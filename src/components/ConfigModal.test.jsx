import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigModal from './ConfigModal';

describe('ConfigModal', () => {
  const mockConfig = {
    xrayClientId: 'test-client-id',
    xrayClientSecret: 'test-secret',
    jiraBaseUrl: 'https://test.atlassian.net',
    projectKey: 'TEST',
  };

  const defaultProps = {
    config: mockConfig,
    onClose: vi.fn(),
    onEdit: vi.fn(),
  };

  it('should render Configuration title', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText('Your current Xray Cloud settings')).toBeInTheDocument();
  });

  it('should display all config values', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText('test-client-id')).toBeInTheDocument();
    expect(screen.getByText('test-secret')).toBeInTheDocument();
    expect(screen.getByText('https://test.atlassian.net')).toBeInTheDocument();
    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('should display labels for config items', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText('Client ID')).toBeInTheDocument();
    expect(screen.getByText('Client Secret')).toBeInTheDocument();
    expect(screen.getByText('Jira Base URL')).toBeInTheDocument();
    expect(screen.getByText('Project Key')).toBeInTheDocument();
  });

  it('should display dash when config value is missing', () => {
    render(<ConfigModal {...defaultProps} config={{}} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBe(4);
  });

  it('should display dash when config is null', () => {
    render(<ConfigModal {...defaultProps} config={null} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBe(4);
  });

  it('should call onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<ConfigModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<ConfigModal {...defaultProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
