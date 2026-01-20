import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableStepCard from './SortableStepCard';

// Wrapper component for DnD context
function DndWrapper({ children }) {
  return (
    <DndContext>
      <SortableContext items={['step-1']} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

describe('SortableStepCard', () => {
  const defaultStep = {
    id: 'step-1',
    action: 'Click button',
    data: 'Test data',
    result: 'Button clicked',
  };

  const defaultProps = {
    step: defaultStep,
    index: 0,
    errors: {},
    canRemove: true,
    onChange: vi.fn(),
    onRemove: vi.fn(),
    disabled: false,
  };

  it('should render step number', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} index={0} />
      </DndWrapper>
    );
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('should render step values', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} />
      </DndWrapper>
    );
    expect(screen.getByDisplayValue('Click button')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test data')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Button clicked')).toBeInTheDocument();
  });

  it('should call onChange when action is changed', () => {
    const onChange = vi.fn();
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} onChange={onChange} />
      </DndWrapper>
    );

    const actionInput = screen.getByDisplayValue('Click button');
    fireEvent.change(actionInput, { target: { value: 'New action' } });

    expect(onChange).toHaveBeenCalledWith('step-1', 'action', 'New action');
  });

  it('should call onChange when data is changed', () => {
    const onChange = vi.fn();
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} onChange={onChange} />
      </DndWrapper>
    );

    const dataInput = screen.getByDisplayValue('Test data');
    fireEvent.change(dataInput, { target: { value: 'New data' } });

    expect(onChange).toHaveBeenCalledWith('step-1', 'data', 'New data');
  });

  it('should call onChange when result is changed', () => {
    const onChange = vi.fn();
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} onChange={onChange} />
      </DndWrapper>
    );

    const resultInput = screen.getByDisplayValue('Button clicked');
    fireEvent.change(resultInput, { target: { value: 'New result' } });

    expect(onChange).toHaveBeenCalledWith('step-1', 'result', 'New result');
  });

  it('should call onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} onRemove={onRemove} />
      </DndWrapper>
    );

    const removeButton = screen.getByTitle('Remove step');
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith('step-1');
  });

  it('should not show remove button when canRemove is false', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} canRemove={false} />
      </DndWrapper>
    );

    expect(screen.queryByTitle('Remove step')).not.toBeInTheDocument();
  });

  it('should not show remove button when disabled', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} disabled={true} />
      </DndWrapper>
    );

    expect(screen.queryByTitle('Remove step')).not.toBeInTheDocument();
  });

  it('should show action error', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} errors={{ step_0_action: 'Action is required' }} />
      </DndWrapper>
    );

    expect(screen.getByText('Action is required')).toBeInTheDocument();
  });

  it('should show result error', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} errors={{ step_0_result: 'Result is required' }} />
      </DndWrapper>
    );

    expect(screen.getByText('Result is required')).toBeInTheDocument();
  });

  it('should have disabled inputs when disabled', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} disabled={true} />
      </DndWrapper>
    );

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });
  });

  it('should not show drag handle when disabled', () => {
    const { container } = render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} disabled={true} />
      </DndWrapper>
    );

    // The drag handle button should not be present
    const dragHandles = container.querySelectorAll('.cursor-grab');
    expect(dragHandles.length).toBe(0);
  });

  it('should show drag handle when not disabled', () => {
    const { container } = render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} disabled={false} />
      </DndWrapper>
    );

    const dragHandles = container.querySelectorAll('.cursor-grab');
    expect(dragHandles.length).toBe(1);
  });

  it('should show required asterisks when not disabled', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} />
      </DndWrapper>
    );

    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBe(2); // Action and Expected Result
  });

  it('should not show required asterisks when disabled', () => {
    render(
      <DndWrapper>
        <SortableStepCard {...defaultProps} disabled={true} />
      </DndWrapper>
    );

    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});
