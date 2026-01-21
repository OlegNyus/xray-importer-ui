import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorPicker, { PASTEL_COLORS } from './ColorPicker';

describe('ColorPicker', () => {
  it('should render all pastel colors', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a5c7e9" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(PASTEL_COLORS.length);
  });

  it('should render label when provided', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a5c7e9" onChange={onChange} label="Pick a color" />);

    expect(screen.getByText('Pick a color')).toBeInTheDocument();
  });

  it('should not render label when not provided', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a5c7e9" onChange={onChange} />);

    expect(screen.queryByText('Pick a color')).not.toBeInTheDocument();
  });

  it('should call onChange when a color is clicked', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a5c7e9" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Click second color (mint)

    expect(onChange).toHaveBeenCalledWith('#a8e6cf');
  });

  it('should highlight selected color with ring', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a8e6cf" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    // Second button should have ring classes
    expect(buttons[1].className).toContain('ring-2');
    expect(buttons[1].className).toContain('scale-110');
  });

  it('should not highlight non-selected colors', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a8e6cf" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    // First button should not have ring-2
    expect(buttons[0].className).not.toContain('ring-2');
  });

  it('should set correct background color on each button', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#a5c7e9" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    PASTEL_COLORS.forEach((color, index) => {
      expect(buttons[index]).toHaveStyle({ backgroundColor: color });
    });
  });

  it('should export PASTEL_COLORS array', () => {
    expect(PASTEL_COLORS).toBeInstanceOf(Array);
    expect(PASTEL_COLORS.length).toBe(8);
    expect(PASTEL_COLORS[0]).toBe('#a5c7e9');
  });
});
