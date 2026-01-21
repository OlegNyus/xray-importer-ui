/**
 * StepProgressBar - Reusable progress indicator for test case workflow
 *
 * Steps:
 * 1. Details - Summary, Description, Labels, Collection
 * 2. Test Steps - Test steps with drag-drop
 * 3. Links - Xray linking (Test Plans, Executions, Sets, Folder)
 * 4. Imported - Final state after import
 */

const STEPS = [
  { id: 1, label: 'Details', shortLabel: 'Details' },
  { id: 2, label: 'Test Steps', shortLabel: 'Steps' },
  { id: 3, label: 'Links', shortLabel: 'Links' },
  { id: 4, label: 'Imported', shortLabel: 'Done' },
];

function StepProgressBar({
  currentStep = 1,
  completedSteps = [],
  status = 'draft',
  compact = false,
  onClick = null,
}) {
  // If status is 'imported', all steps are complete
  const isImported = status === 'imported';

  // Determine which steps are completed
  const getStepState = (stepId) => {
    if (isImported) return 'completed';
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    if (stepId < currentStep) return 'completed';
    return 'pending';
  };

  const getStepClasses = (state) => {
    switch (state) {
      case 'completed':
        return 'bg-emerald-500 text-white';
      case 'current':
        return 'bg-primary-500 text-white';
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
    }
  };

  const getLabelClasses = (state) => {
    switch (state) {
      case 'completed':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'current':
        return 'text-primary-600 dark:text-primary-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getLineClasses = (stepId) => {
    const nextState = getStepState(stepId + 1);
    const currentState = getStepState(stepId);

    if (currentState === 'completed' && (nextState === 'completed' || nextState === 'current')) {
      return 'bg-emerald-500';
    }
    if (currentState === 'current') {
      return 'bg-gradient-to-r from-primary-500 to-gray-200 dark:to-gray-700';
    }
    return 'bg-gray-200 dark:bg-gray-700';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STEPS.map((step, index) => {
          const state = getStepState(step.id);
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  state === 'completed' ? 'bg-emerald-500' :
                  state === 'current' ? 'bg-primary-500' :
                  'bg-gray-300 dark:bg-gray-600'
                }`}
                title={step.label}
              />
              {index < STEPS.length - 1 && (
                <div className={`w-3 h-0.5 ${getLineClasses(step.id)}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, index) => {
        const state = getStepState(step.id);
        const isClickable = onClick && (state === 'completed' || state === 'current');

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div
              className={`flex items-center ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={isClickable ? () => onClick(step.id) : undefined}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${getStepClasses(state)}`}
              >
                {state === 'completed' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:inline ${getLabelClasses(state)}`}>
                {step.label}
              </span>
              <span className={`ml-2 text-sm font-medium sm:hidden ${getLabelClasses(state)}`}>
                {step.shortLabel}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 sm:mx-4 ${getLineClasses(step.id)}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper to calculate completed steps from test case data
export function getCompletedSteps(testCase) {
  if (!testCase) return [];

  const completed = [];

  // Step 1: Details - has summary and description
  if (testCase.summary?.trim() && testCase.description?.trim()) {
    completed.push(1);
  }

  // Step 2: Test Steps - has at least one valid step
  if (testCase.steps?.length > 0) {
    const hasValidStep = testCase.steps.some(
      step => step.action?.trim() && step.result?.trim()
    );
    if (hasValidStep) {
      completed.push(2);
    }
  }

  // Step 3: Links - has Xray linking configured
  const linking = testCase.xrayLinking;
  if (linking) {
    const hasLinks =
      (linking.testPlanIds?.length > 0 || linking.testPlanId) &&
      (linking.testExecutionIds?.length > 0 || linking.testExecutionId) &&
      (linking.testSetIds?.length > 0 || linking.testSetId) &&
      linking.folderPath?.trim();
    if (hasLinks) {
      completed.push(3);
    }
  }

  // Step 4: Imported
  if (testCase.status === 'imported') {
    completed.push(4);
  }

  return completed;
}

// Helper to get current step from test case data
export function getCurrentStep(testCase) {
  if (!testCase) return 1;
  if (testCase.status === 'imported') return 4;

  const completed = getCompletedSteps(testCase);

  // Return first incomplete step, or last step if all complete
  for (let i = 1; i <= 4; i++) {
    if (!completed.includes(i)) return i;
  }
  return 4;
}

export default StepProgressBar;
