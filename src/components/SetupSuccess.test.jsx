import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupSuccess from './SetupSuccess';

describe('SetupSuccess', () => {
  it('should render success message', () => {
    render(<SetupSuccess onContinue={vi.fn()} />);
    expect(screen.getByText("You're All Set!")).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<SetupSuccess onContinue={vi.fn()} />);
    expect(screen.getByText('Your Xray Cloud credentials have been validated and saved.')).toBeInTheDocument();
  });

  it('should render continue button', () => {
    render(<SetupSuccess onContinue={vi.fn()} />);
    expect(screen.getByText('Start Creating Test Cases')).toBeInTheDocument();
  });

  it('should call onContinue when button is clicked', () => {
    const onContinue = vi.fn();
    render(<SetupSuccess onContinue={onContinue} />);

    fireEvent.click(screen.getByText('Start Creating Test Cases'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

});
