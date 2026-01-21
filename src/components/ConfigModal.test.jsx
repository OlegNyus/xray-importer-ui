import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigModal from './ConfigModal';

describe('ConfigModal', () => {
  const mockConfig = {
    xrayClientId: 'ABC123DEF456GHI789',
    xrayClientSecret: 'secret123456789xyz',
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

  it('should display truncated credentials and full other values', () => {
    render(<ConfigModal {...defaultProps} />);
    // Credentials should be truncated (first 6 + ... + last 6)
    expect(screen.getByText('ABC123...GHI789')).toBeInTheDocument();
    expect(screen.getByText('secret...789xyz')).toBeInTheDocument();
    // Jira URL shown in full
    expect(screen.getByText('https://test.atlassian.net')).toBeInTheDocument();
  });

  it('should display labels for config items', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText('Client ID')).toBeInTheDocument();
    expect(screen.getByText('Client Secret')).toBeInTheDocument();
    expect(screen.getByText('Jira Base URL')).toBeInTheDocument();
  });

  it('should display dash when config value is missing', () => {
    render(<ConfigModal {...defaultProps} config={{}} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBe(3);
  });

  it('should display dash when config is null', () => {
    render(<ConfigModal {...defaultProps} config={null} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBe(3);
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
