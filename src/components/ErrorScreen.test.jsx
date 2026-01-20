import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorScreen from './ErrorScreen';

describe('ErrorScreen', () => {
  const defaultProps = {
    result: { error: 'Test error message' },
    onBackToBuilder: vi.fn(),
    onReconfigure: vi.fn(),
  };

  it('should render Import Failed title', () => {
    render(<ErrorScreen {...defaultProps} />);
    expect(screen.getByText('Import Failed')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<ErrorScreen {...defaultProps} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should display credential error message when error contains credentials', () => {
    render(
      <ErrorScreen
        {...defaultProps}
        result={{ error: 'Invalid credentials' }}
      />
    );
    expect(screen.getByText('Authentication failed. Please check your credentials.')).toBeInTheDocument();
  });

  it('should display generic error message for non-credential errors', () => {
    render(
      <ErrorScreen
        {...defaultProps}
        result={{ error: 'Network error' }}
      />
    );
    expect(screen.getByText('There was a problem importing your test case.')).toBeInTheDocument();
  });

  it('should display Unknown error when no error provided', () => {
    render(
      <ErrorScreen
        {...defaultProps}
        result={{}}
      />
    );
    expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
  });

  it('should display Unknown error when result is null', () => {
    render(
      <ErrorScreen
        {...defaultProps}
        result={null}
      />
    );
    expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
  });

  it('should call onBackToBuilder when Back to Builder is clicked', () => {
    const onBackToBuilder = vi.fn();
    render(<ErrorScreen {...defaultProps} onBackToBuilder={onBackToBuilder} />);

    fireEvent.click(screen.getByText('Back to Builder'));
    expect(onBackToBuilder).toHaveBeenCalledTimes(1);
  });

  it('should call onReconfigure when Reconfigure Credentials is clicked', () => {
    const onReconfigure = vi.fn();
    render(<ErrorScreen {...defaultProps} onReconfigure={onReconfigure} />);

    fireEvent.click(screen.getByText('Reconfigure Credentials'));
    expect(onReconfigure).toHaveBeenCalledTimes(1);
  });
});
