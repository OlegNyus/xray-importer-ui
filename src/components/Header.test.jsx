import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  const mockConfig = {
    xrayClientId: 'test-client-id',
    xrayClientSecret: 'test-secret',
    jiraBaseUrl: 'https://test.atlassian.net',
    projectKey: 'TEST',
  };

  const defaultProps = {
    isConfigured: true,
    config: mockConfig,
    darkMode: false,
    onToggleDarkMode: vi.fn(),
    onReconfigure: vi.fn(),
  };

  it('should render RayDrop logo text', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('RayDrop')).toBeInTheDocument();
  });

  it('should display Connected to Xray when configured', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Connected to Xray')).toBeInTheDocument();
  });

  it('should display Not configured when not configured', () => {
    render(<Header {...defaultProps} isConfigured={false} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('should call onToggleDarkMode when theme button is clicked', () => {
    const onToggleDarkMode = vi.fn();
    render(<Header {...defaultProps} onToggleDarkMode={onToggleDarkMode} />);

    const themeButton = screen.getByTitle('Switch to dark mode');
    fireEvent.click(themeButton);
    expect(onToggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('should show dark mode button title when in light mode', () => {
    render(<Header {...defaultProps} darkMode={false} />);
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
  });

  it('should show light mode button title when in dark mode', () => {
    render(<Header {...defaultProps} darkMode={true} />);
    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument();
  });

  it('should show config button when configured', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTitle('View Configuration')).toBeInTheDocument();
  });

  it('should not show config button when not configured', () => {
    render(<Header {...defaultProps} isConfigured={false} />);
    expect(screen.queryByTitle('View Configuration')).not.toBeInTheDocument();
  });

  it('should open config modal when config button is clicked', () => {
    render(<Header {...defaultProps} />);

    fireEvent.click(screen.getByTitle('View Configuration'));
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Your current Xray Cloud settings')).toBeInTheDocument();
  });

  it('should close config modal when Close is clicked', () => {
    render(<Header {...defaultProps} />);

    fireEvent.click(screen.getByTitle('View Configuration'));
    expect(screen.getByText('Configuration')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Your current Xray Cloud settings')).not.toBeInTheDocument();
  });

  it('should call onReconfigure when Edit is clicked in modal', () => {
    const onReconfigure = vi.fn();
    render(<Header {...defaultProps} onReconfigure={onReconfigure} />);

    fireEvent.click(screen.getByTitle('View Configuration'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onReconfigure).toHaveBeenCalledTimes(1);
  });

  it('should close modal after Edit is clicked', () => {
    render(<Header {...defaultProps} />);

    fireEvent.click(screen.getByTitle('View Configuration'));
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.queryByText('Your current Xray Cloud settings')).not.toBeInTheDocument();
  });
});
