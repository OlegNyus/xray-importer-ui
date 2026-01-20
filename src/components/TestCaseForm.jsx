import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableStepCard from './SortableStepCard';
import TagInput from './TagInput';
import SummaryInput from './SummaryInput';
import Modal from './Modal';
import { createDraft, updateDraft, importDraft } from '../utils/api';

const emptyStep = { action: '', data: '', result: '' };

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6b7280',
];

function TestCaseForm({
  config,
  editingTestCase,
  editingId,
  onSaveDraft,
  onImportSuccess,
  onImportError,
  onCreateNew,
  setHasUnsavedChanges,
  showToast,
  collections = [],
  onCreateCollection,
}) {
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    testType: 'Manual',
    priority: '',
    labels: [],
    collectionId: '',
    steps: [{ ...emptyStep, id: crypto.randomUUID() }],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // New collection form state
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState(PRESET_COLORS[0]);
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Check if TC is imported (read-only)
  const isReadOnly = editingTestCase?.status === 'imported';

  // Compute current completeness for status display
  function checkComplete() {
    const hasRequiredFields =
      formData.summary?.trim() &&
      formData.description?.trim() &&
      formData.steps?.length > 0;

    if (!hasRequiredFields) return false;

    return formData.steps.every(
      (step) => step.action?.trim() && step.result?.trim()
    );
  }

  const currentIsComplete = checkComplete();

  // Get current status badge
  function getStatusBadge() {
    // Imported - read-only
    if (isReadOnly) {
      return (
        <span className="text-xs font-normal px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1">
          Imported
        </span>
      );
    }
    // New - not saved yet
    if (!editingId) {
      return (
        <span className="text-xs font-normal px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
          New
        </span>
      );
    }
    // Draft - saved, show completeness indicator
    if (currentIsComplete) {
      return (
        <span className="text-xs font-normal px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-1">
          Draft
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      );
    }
    return (
      <span className="text-xs font-normal px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
        Draft
      </span>
    );
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load editing test case
  useEffect(() => {
    if (editingTestCase) {
      setFormData({
        summary: editingTestCase.summary || '',
        description: editingTestCase.description || '',
        testType: editingTestCase.testType || 'Manual',
        priority: editingTestCase.priority || '',
        labels: editingTestCase.labels || [],
        collectionId: editingTestCase.collectionId || '',
        steps: editingTestCase.steps?.length > 0
          ? editingTestCase.steps.map((s) => ({ ...s, id: s.id || crypto.randomUUID() }))
          : [{ ...emptyStep, id: crypto.randomUUID() }],
      });
      setErrors({});
      setHasChanges(false);
    } else {
      resetForm();
    }
  }, [editingTestCase]);

  function resetForm() {
    setFormData({
      summary: '',
      description: '',
      testType: 'Manual',
      priority: '',
      labels: [],
      collectionId: '',
      steps: [{ ...emptyStep, id: crypto.randomUUID() }],
    });
    setErrors({});
    setHasUnsavedChanges(false);
    setHasChanges(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    setHasChanges(true);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function handleLabelsChange(labels) {
    setFormData((prev) => ({ ...prev, labels }));
    setHasUnsavedChanges(true);
    setHasChanges(true);
  }

  function handleStepChange(id, field, value) {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === id ? { ...step, [field]: value } : step
      ),
    }));
    setHasUnsavedChanges(true);
    setHasChanges(true);
    // Clear step error when user types
    const stepIndex = formData.steps.findIndex((s) => s.id === id);
    const errorKey = `step_${stepIndex}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: null }));
    }
  }

  function addStep() {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { ...emptyStep, id: crypto.randomUUID() }],
    }));
    setHasUnsavedChanges(true);
    setHasChanges(true);
  }

  function removeStep(id) {
    if (formData.steps.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((step) => step.id !== id),
    }));
    setHasUnsavedChanges(true);
    setHasChanges(true);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.steps.findIndex((s) => s.id === active.id);
        const newIndex = prev.steps.findIndex((s) => s.id === over.id);
        return {
          ...prev,
          steps: arrayMove(prev.steps, oldIndex, newIndex),
        };
      });
      setHasUnsavedChanges(true);
      setHasChanges(true);
    }
  }

  function validateForImport() {
    const newErrors = {};

    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    formData.steps.forEach((step, index) => {
      if (!step.action.trim()) {
        newErrors[`step_${index}_action`] = 'Action is required';
      }
      if (!step.result.trim()) {
        newErrors[`step_${index}_result`] = 'Expected Result is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function getTestCaseData() {
    return {
      summary: formData.summary,
      description: formData.description,
      testType: 'Manual', // Fixed for now
      priority: 'Medium', // Fixed for now
      labels: formData.labels,
      collectionId: formData.collectionId || null,
      steps: formData.steps.map(({ id, ...rest }) => rest), // Remove id for API
    };
  }

  function hasFormData() {
    return (
      formData.summary.trim() ||
      formData.description.trim() ||
      formData.labels.length > 0 ||
      formData.steps.some((s) => s.action.trim() || s.data.trim() || s.result.trim())
    );
  }

  function handleSaveDraft() {
    onSaveDraft(getTestCaseData());
    setHasChanges(false);
    setHasUnsavedChanges(false);
    setShowSavedModal(true);
  }

  async function handleImport(e) {
    e.preventDefault();

    if (!validateForImport()) {
      showToast('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      let draftId = editingId;

      // If editing, update the draft first; if new, create it
      if (editingId) {
        const updateResult = await updateDraft(editingId, getTestCaseData());
        if (!updateResult.success) {
          onImportError({ success: false, error: updateResult.error || 'Failed to save draft' });
          setLoading(false);
          return;
        }
      } else {
        const createResult = await createDraft(getTestCaseData());
        if (!createResult.success) {
          onImportError({ success: false, error: createResult.error || 'Failed to save draft' });
          setLoading(false);
          return;
        }
        draftId = createResult.id;
      }

      // Now import the draft
      const result = await importDraft(draftId);

      if (result.success) {
        setHasUnsavedChanges(false);
        onImportSuccess({ ...result, draftId });
      } else {
        onImportError(result);
      }
    } catch (error) {
      onImportError({
        success: false,
        error: error.message || 'Import failed',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (hasFormData()) {
      setShowResetModal(true);
    } else {
      resetForm();
    }
  }

  function confirmReset() {
    resetForm();
    setShowResetModal(false);
    showToast('Form reset');
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {isReadOnly ? 'View Test Case' : editingId ? 'Edit Test Case' : 'Create Test Case'}
          {getStatusBadge()}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isReadOnly
            ? 'This test case has been imported to Xray and is read-only'
            : editingId
              ? 'Modify the test case and save or import'
              : 'Fill in the details below and import to Xray Cloud'}
        </p>
      </div>

      <form onSubmit={handleImport} className="space-y-6">
        {/* Test Case Details */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Test Case Details</h3>

          <SummaryInput
            value={formData.summary}
            onChange={(summary) => {
              if (isReadOnly) return;
              setFormData((prev) => ({ ...prev, summary }));
              setHasUnsavedChanges(true);
              setHasChanges(true);
              if (errors.summary) {
                setErrors((prev) => ({ ...prev, summary: null }));
              }
            }}
            error={errors.summary}
            editingId={editingId}
            disabled={isReadOnly}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description {!isReadOnly && <span className="text-red-500">*</span>}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Detailed description of the test case"
              disabled={isReadOnly}
              className={`input ${errors.description ? 'input-error' : ''} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Type
                <span className="ml-2 text-xs text-gray-400">(Coming soon)</span>
              </label>
              <select
                name="testType"
                value="Manual"
                disabled
                className="select opacity-60 cursor-not-allowed"
              >
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
                <span className="ml-2 text-xs text-gray-400">(Coming soon)</span>
              </label>
              <select
                name="priority"
                value="Medium"
                disabled
                className="select opacity-60 cursor-not-allowed"
              >
                <option value="Medium">Medium</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Labels
            </label>
            <TagInput
              tags={formData.labels}
              onChange={handleLabelsChange}
              placeholder="Type and press Enter to add labels"
              disabled={isReadOnly}
            />
          </div>

          {/* Collection selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Collection
            </label>
            {!showNewCollectionForm ? (
              <div className="flex gap-2">
                <select
                  name="collectionId"
                  value={formData.collectionId}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className={`select flex-1 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">No collection</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
                {!isReadOnly && onCreateCollection && (
                  <button
                    type="button"
                    onClick={() => setShowNewCollectionForm(true)}
                    className="btn btn-secondary btn-sm whitespace-nowrap"
                  >
                    + New
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name..."
                    className="input flex-1 text-sm"
                    maxLength={30}
                    autoFocus
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCollectionColor(color)}
                      className={`w-5 h-5 rounded-full transition-all ${
                        newCollectionColor === color
                          ? 'ring-2 ring-offset-1 ring-primary-500 dark:ring-offset-gray-800 scale-110'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCollectionForm(false);
                      setNewCollectionName('');
                      setNewCollectionColor(PRESET_COLORS[0]);
                    }}
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!newCollectionName.trim() || creatingCollection}
                    onClick={async () => {
                      const trimmedName = newCollectionName.trim();
                      // Check for duplicate name
                      const isDuplicate = collections.some(
                        c => c.name.toLowerCase() === trimmedName.toLowerCase()
                      );
                      if (isDuplicate) {
                        showToast('Collection with this name already exists');
                        return;
                      }
                      setCreatingCollection(true);
                      try {
                        const newCollection = await onCreateCollection(trimmedName, newCollectionColor);
                        setShowNewCollectionForm(false);
                        setNewCollectionName('');
                        setNewCollectionColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
                        // Auto-select the newly created collection
                        if (newCollection?.id) {
                          setFormData(prev => ({ ...prev, collectionId: newCollection.id }));
                        }
                      } finally {
                        setCreatingCollection(false);
                      }
                    }}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    {creatingCollection ? <span className="spinner"></span> : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Test Steps</h3>
            {!isReadOnly && (
              <button type="button" onClick={addStep} className="btn btn-secondary btn-sm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add Step
              </button>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={formData.steps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <SortableStepCard
                    key={step.id}
                    step={step}
                    index={index}
                    errors={errors}
                    canRemove={formData.steps.length > 1}
                    onChange={handleStepChange}
                    onRemove={removeStep}
                    disabled={isReadOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Form Hint */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>
              <strong>Save Draft</strong> — no validation &nbsp;|&nbsp; <strong>Import</strong> — requires all fields
            </span>
          </div>
        )}

        {/* Actions */}
        {isReadOnly ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>
              This test case has been imported to Xray and cannot be modified.
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button type="button" onClick={handleReset} className="btn btn-ghost order-3 sm:order-1">
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={editingId ? !hasChanges : !hasFormData()}
              className="btn btn-secondary order-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4a1 1 0 011-1h7l2 2v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 3v3h5V3M5 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {editingId ? 'Update Draft' : 'Save Draft'}
            </button>
            <button type="submit" disabled={loading || !currentIsComplete} className="btn btn-primary sm:flex-1 order-1 sm:order-3">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Importing...
                </>
              ) : (
                <>
                  Import to Xray
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Reset Modal */}
      {showResetModal && (
        <Modal onClose={() => setShowResetModal(false)}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17v.5" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Reset Form?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              This will clear all fields and start fresh. Any unsaved changes will be lost.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={confirmReset} className="btn btn-warning flex-1">
                Reset
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Draft Saved Modal */}
      {showSavedModal && (
        <Modal onClose={() => setShowSavedModal(false)}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {editingId ? 'Draft Updated' : 'Draft Saved'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your test case has been saved locally. What would you like to do next?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSavedModal(false);
                  onCreateNew();
                }}
                className="btn btn-secondary flex-1"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Create New
              </button>
              <button
                onClick={() => setShowSavedModal(false)}
                className="btn btn-primary flex-1"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default TestCaseForm;
