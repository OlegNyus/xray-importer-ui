import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableStepCard({ step, index, errors, canRemove, onChange, onRemove, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const actionError = errors[`step_${index}_action`];
  const resultError = errors[`step_${index}_result`];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4
        ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          {!disabled && (
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              {...attributes}
              {...listeners}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 4h.5M5 8h.5M5 12h.5M10.5 4h.5M10.5 8h.5M10.5 12h.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Step {index + 1}
          </span>
        </div>

        {canRemove && !disabled && (
          <button
            type="button"
            onClick={() => onRemove(step.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove step"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Action {!disabled && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={step.action}
            onChange={(e) => onChange(step.id, 'action', e.target.value)}
            rows={2}
            placeholder="What action to perform"
            disabled={disabled}
            className={`input ${actionError ? 'input-error' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {actionError && (
            <p className="text-red-500 text-sm mt-1">{actionError}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test Data
            </label>
            <textarea
              value={step.data}
              onChange={(e) => onChange(step.id, 'data', e.target.value)}
              rows={2}
              placeholder="Input data (optional)"
              disabled={disabled}
              className={`input ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expected Result {!disabled && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={step.result}
              onChange={(e) => onChange(step.id, 'result', e.target.value)}
              rows={2}
              placeholder="Expected outcome"
              disabled={disabled}
              className={`input ${resultError ? 'input-error' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {resultError && (
              <p className="text-red-500 text-sm mt-1">{resultError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SortableStepCard;
