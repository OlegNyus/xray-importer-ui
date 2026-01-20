import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  let originalOverflow;

  beforeEach(() => {
    originalOverflow = document.body.style.overflow;
  });

  afterEach(() => {
    document.body.style.overflow = originalOverflow;
  });

  it('should render children', () => {
    render(
      <Modal onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose for other keys', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should call onClose when clicking overlay', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    const overlay = document.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking modal content', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div data-testid="content">Content</div>
      </Modal>
    );

    fireEvent.click(screen.getByTestId('content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should set body overflow to hidden on mount', () => {
    render(
      <Modal onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body overflow on unmount', () => {
    const { unmount } = render(
      <Modal onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    );

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('should remove event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
