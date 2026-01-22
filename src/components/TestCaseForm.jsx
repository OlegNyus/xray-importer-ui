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
import CollectionInput from './CollectionInput';
import SummaryInput from './SummaryInput';
import Modal from './Modal';
import XrayLinkingPanel from './XrayLinkingPanel';
import StepProgressBar, { getCompletedSteps } from './StepProgressBar';
import TestCasePreview from './TestCasePreview';
import { createDraft, updateDraft, importDraft, linkTestToEntities } from '../utils/api';

const emptyStep = { action: '', data: '', result: '' };

function TestCaseForm({
  config,
  activeProject,
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
  xrayEntitiesCache = null,
  onLoadXrayEntities = null,
  onRefresh = null,
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
  const [xrayLinking, setXrayLinking] = useState({
    testPlanIds: [],
    testPlanDisplays: [],
    testExecutionIds: [],
    testExecutionDisplays: [],
    testSetIds: [],
    testSetDisplays: [],
    folderPath: '/',
    projectId: null,
    preconditionIds: [],
    preconditionDisplays: [],
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showXrayValidation, setShowXrayValidation] = useState(false);

  // Check if TC is imported (read-only)
  const isReadOnly = editingTestCase?.status === 'imported';

  // Render preview layout for imported test cases
  if (isReadOnly && editingTestCase) {
    return (
      <TestCasePreview
        testCase={editingTestCase}
        config={config}
        activeProject={activeProject}
        xrayEntitiesCache={xrayEntitiesCache}
        onLoadXrayEntities={onLoadXrayEntities}
        onLinksUpdated={onRefresh}
        showToast={showToast}
      />
    );
  }

  // Migrate old single-select state to new multi-select arrays
  function migrateXrayLinking(linking) {
    if (!linking) return getEmptyXrayLinking();

    const migrated = { ...linking };

    // Migrate testPlanId -> testPlanIds
    if (linking.testPlanId && !linking.testPlanIds?.length) {
      migrated.testPlanIds = [linking.testPlanId];
      migrated.testPlanDisplays = linking.testPlanDisplay
        ? [{ id: linking.testPlanId, display: linking.testPlanDisplay }]
        : [];
    }
    if (!migrated.testPlanIds) migrated.testPlanIds = [];
    if (!migrated.testPlanDisplays) migrated.testPlanDisplays = [];

    // Migrate testExecutionId -> testExecutionIds
    if (linking.testExecutionId && !linking.testExecutionIds?.length) {
      migrated.testExecutionIds = [linking.testExecutionId];
      migrated.testExecutionDisplays = linking.testExecutionDisplay
        ? [{ id: linking.testExecutionId, display: linking.testExecutionDisplay }]
        : [];
    }
    if (!migrated.testExecutionIds) migrated.testExecutionIds = [];
    if (!migrated.testExecutionDisplays) migrated.testExecutionDisplays = [];

    // Migrate testSetId -> testSetIds
    if (linking.testSetId && !linking.testSetIds?.length) {
      migrated.testSetIds = [linking.testSetId];
      migrated.testSetDisplays = linking.testSetDisplay
        ? [{ id: linking.testSetId, display: linking.testSetDisplay }]
        : [];
    }
    if (!migrated.testSetIds) migrated.testSetIds = [];
    if (!migrated.testSetDisplays) migrated.testSetDisplays = [];

    // Ensure other arrays exist
    if (!migrated.preconditionIds) migrated.preconditionIds = [];
    if (!migrated.preconditionDisplays) migrated.preconditionDisplays = [];
    if (!migrated.folderPath) migrated.folderPath = '/';

    return migrated;
  }

  function getEmptyXrayLinking() {
    return {
      testPlanIds: [],
      testPlanDisplays: [],
      testExecutionIds: [],
      testExecutionDisplays: [],
      testSetIds: [],
      testSetDisplays: [],
      folderPath: '/',
      projectId: null,
      preconditionIds: [],
      preconditionDisplays: [],
    };
  }

  // Check if Step 1 (Details) is valid
  function isStep1Valid() {
    return formData.summary?.trim() && formData.description?.trim();
  }

  // Check if Step 2 (Test Steps) is valid
  function isStep2Valid() {
    if (!formData.steps?.length) return false;
    return formData.steps.every(
      (step) => step.action?.trim() && step.result?.trim()
    );
  }

  // Check if Step 3 (Xray Links) is valid
  function isStep3Valid() {
    return (
      xrayLinking.testPlanIds?.length > 0 &&
      xrayLinking.testExecutionIds?.length > 0 &&
      xrayLinking.testSetIds?.length > 0 &&
      xrayLinking.folderPath?.trim()
    );
  }

  // Compute current completeness for status display
  function checkComplete() {
    return isStep1Valid() && isStep2Valid() && isStep3Valid();
  }

  const currentIsComplete = checkComplete();

  // Check if project matches (for import validation)
  const projectMismatch = editingTestCase?.projectKey && editingTestCase.projectKey !== activeProject;

  // Get current status badge
  function getStatusBadge() {
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

  // Track which test case ID we last loaded to avoid resetting on save
  const [loadedTestCaseId, setLoadedTestCaseId] = useState(null);
  // Track if we just saved a new draft (to prevent form reset on first save)
  const [justSavedNewDraft, setJustSavedNewDraft] = useState(false);

  // Load editing test case
  useEffect(() => {
    if (editingTestCase) {
      // Only reset form data if loading a different test case
      const isDifferentTestCase = editingTestCase.id !== loadedTestCaseId;

      if (isDifferentTestCase) {
        // When a new draft is saved for the first time, don't reset form
        // The form already has the correct data since user just entered it
        if (justSavedNewDraft && loadedTestCaseId === null) {
          // Just mark this test case as loaded, preserve current form state and step
          setLoadedTestCaseId(editingTestCase.id);
          setJustSavedNewDraft(false);
        } else {
          // Loading a different test case - load its data
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
          // Load saved Xray linking data with migration
          setXrayLinking(migrateXrayLinking(editingTestCase.xrayLinking));
          setErrors({});
          setHasChanges(false);
          setCurrentStep(1);
          setLoadedTestCaseId(editingTestCase.id);
        }
      }
    } else {
      resetForm();
      setLoadedTestCaseId(null);
    }
  }, [editingTestCase, loadedTestCaseId, justSavedNewDraft]);

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
    setXrayLinking(getEmptyXrayLinking());
    setErrors({});
    setHasUnsavedChanges(false);
    setHasChanges(false);
    setShowXrayValidation(false);
    setCurrentStep(1);
    setJustSavedNewDraft(false);
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

    // Validate Xray linking fields (required for import)
    const xrayValid =
      xrayLinking.testPlanIds?.length > 0 &&
      xrayLinking.testExecutionIds?.length > 0 &&
      xrayLinking.testSetIds?.length > 0 &&
      xrayLinking.folderPath?.trim();

    if (!xrayValid) {
      newErrors.xrayLinking = 'All Xray linking fields are required';
    }

    setErrors(newErrors);
    setShowXrayValidation(true);
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
      xrayLinking: xrayLinking, // Persist Xray linking selections
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
    // If this is a new draft (no editingId yet), mark it so we don't reset form on save
    if (!editingId) {
      setJustSavedNewDraft(true);
    }
    onSaveDraft(getTestCaseData());
    setHasChanges(false);
    setHasUnsavedChanges(false);
    setShowSavedModal(true);
  }

  async function handleImport(e) {
    e.preventDefault();

    // Validate project match - user can only import to active project
    if (editingTestCase?.projectKey && editingTestCase.projectKey !== activeProject) {
      showToast(`Cannot import: This draft belongs to ${editingTestCase.projectKey}. Switch to that project to import.`);
      return;
    }

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
        // Link to Xray entities if we have testIssueId
        if (result.testIssueId) {
          try {
            const linkResult = await linkTestToEntities({
              testIssueId: result.testIssueId,
              testPlanIds: xrayLinking.testPlanIds,
              testExecutionIds: xrayLinking.testExecutionIds,
              testSetIds: xrayLinking.testSetIds,
              projectId: xrayLinking.projectId,
              projectKey: activeProject,
              folderPath: xrayLinking.folderPath,
              preconditionIds: xrayLinking.preconditionIds,
            });

            if (linkResult.warnings?.length) {
              showToast(`Linked with warnings: ${linkResult.warnings.join(', ')}`);
            }
          } catch (linkError) {
            // Don't fail the whole import if linking fails
            showToast(`Import succeeded but linking failed: ${linkError.message}`);
          }
        }

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

  function handleNextStep() {
    if (currentStep === 1) {
      if (isStep1Valid()) {
        setCurrentStep(2);
      } else {
        setErrors({
          summary: !formData.summary?.trim() ? 'Summary is required' : null,
          description: !formData.description?.trim() ? 'Description is required' : null,
        });
        showToast('Please fill in Summary and Description');
      }
    } else if (currentStep === 2) {
      if (isStep2Valid()) {
        setCurrentStep(3);
      } else {
        // Validate steps and show errors
        const newErrors = {};
        formData.steps.forEach((step, index) => {
          if (!step.action?.trim()) {
            newErrors[`step_${index}_action`] = 'Action is required';
          }
          if (!step.result?.trim()) {
            newErrors[`step_${index}_result`] = 'Expected Result is required';
          }
        });
        setErrors(newErrors);
        showToast('Please complete all test steps');
      }
    }
  }

  function handlePrevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  return (
    <>
      {/* Status and project info bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {getStatusBadge()}
        {activeProject && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Importing to:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 3h8v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 3l2-2h4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              {activeProject}
            </span>
          </div>
        )}
        {/* Warning if draft is from different project */}
        {editingTestCase?.projectKey && editingTestCase.projectKey !== activeProject && (
          <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 5v3M7 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6.13 2.44L1.09 10.5a1 1 0 00.87 1.5h10.08a1 1 0 00.87-1.5L7.87 2.44a1 1 0 00-1.74 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span>
              This draft was created for <strong>{editingTestCase.projectKey}</strong>.
              It will be imported to <strong>{activeProject}</strong>.
            </span>
          </div>
        )}
      </div>

      {/* Step Progress Bar */}
      <div className="mb-6">
        <StepProgressBar
          currentStep={currentStep}
          completedSteps={getCompletedSteps(getTestCaseData())}
          status={editingTestCase?.status || 'draft'}
          onClick={(step) => {
            // Allow clicking on completed steps to navigate back
            if (step < currentStep) {
              setCurrentStep(step);
            }
          }}
        />
      </div>

      <form onSubmit={handleImport} className="space-y-6">
        {/* Step 1: Test Case Details */}
        {currentStep === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Test Case Details</h3>

          <SummaryInput
            value={formData.summary}
            onChange={(summary) => {
              setFormData((prev) => ({ ...prev, summary }));
              setHasUnsavedChanges(true);
              setHasChanges(true);
              if (errors.summary) {
                setErrors((prev) => ({ ...prev, summary: null }));
              }
            }}
            error={errors.summary}
            editingId={editingId}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Detailed description of the test case"
              className={`input ${errors.description ? 'input-error' : ''}`}
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
            />
          </div>

          {/* Collection selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Collection
            </label>
            <CollectionInput
              value={formData.collectionId}
              onChange={(collectionId) => {
                setFormData((prev) => ({ ...prev, collectionId }));
                setHasUnsavedChanges(true);
                setHasChanges(true);
              }}
              collections={collections}
              onCreateCollection={onCreateCollection}
              placeholder="Select collection..."
            />
          </div>

        {/* Step 1 Actions */}
        {currentStep === 1 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isStep1Valid()}
              className="btn btn-primary sm:flex-1 order-1 sm:order-3"
            >
              Next: Test Steps
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
        </div>
        )}

        {/* Step 2: Test Steps */}
        {currentStep === 2 && (
        <>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Test Steps</h3>
            <button type="button" onClick={addStep} className="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Step
            </button>
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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Step 2 Actions */}
        {currentStep === 2 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={handlePrevStep} className="btn btn-ghost order-3 sm:order-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
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
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isStep2Valid()}
              className="btn btn-primary sm:flex-1 order-1 sm:order-3"
            >
              Next: Xray Links
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
        </>
        )}

        {/* Step 3: Xray Links */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {activeProject && (
              <XrayLinkingPanel
                projectKey={activeProject}
                value={xrayLinking}
                onChange={(newLinking) => {
                  setXrayLinking(newLinking);
                  setHasUnsavedChanges(true);
                  setHasChanges(true);
                }}
                showValidation={showXrayValidation}
                xrayEntitiesCache={xrayEntitiesCache}
                onLoadXrayEntities={onLoadXrayEntities}
              />
            )}

            {/* Step 3 Actions */}
            {currentStep === 3 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={handlePrevStep} className="btn btn-ghost order-3 sm:order-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
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
                <button type="submit" disabled={loading || !currentIsComplete || projectMismatch} className="btn btn-primary sm:flex-1 order-1 sm:order-3">
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
