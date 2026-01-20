import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  it('should render message', () => {
    render(<Toast message="Test message" onClose={vi.fn()} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should call onClose after default duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should call onClose after custom duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} duration={1000} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should clear timeout on unmount', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { unmount } = render(<Toast message="Test" onClose={onClose} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

});
