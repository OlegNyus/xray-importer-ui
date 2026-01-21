import XrayLinksEditor from './XrayLinksEditor';

function TestCasePreview({
  testCase,
  config,
  activeProject,
  xrayEntitiesCache,
  onLoadXrayEntities,
  onLinksUpdated,
  showToast,
}) {
  const jiraBaseUrl = config?.jiraBaseUrl || 'https://your-domain.atlassian.net';

  return (
    <div className="space-y-6">
      {/* Header with testKey and summary */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3 mb-2">
          {testCase.testKey && (
            <a
              href={`${jiraBaseUrl}/browse/${testCase.testKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-sm hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 9L9 5M9 5H5.5M9 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {testCase.testKey}
            </a>
          )}
          <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Imported
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {testCase.summary}
        </h2>
        {testCase.importedAt && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Imported on {new Date(testCase.importedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* Details Card */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Details</h3>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Description
          </label>
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {testCase.description || 'No description'}
          </p>
        </div>

        {/* Test Type and Labels in a row */}
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Test Type
            </label>
            <span className="text-gray-900 dark:text-white">
              {testCase.testType || 'Manual'}
            </span>
          </div>

          {testCase.labels?.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Labels
              </label>
              <div className="flex flex-wrap gap-1">
                {testCase.labels.map((label, i) => (
                  <span key={i} className="tag text-xs">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Steps */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Test Steps ({testCase.steps?.length || 0})
        </h3>
        <div className="space-y-3">
          {testCase.steps?.map((step, index) => (
            <div
              key={step.id || index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Action
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {step.action}
                    </p>
                  </div>
                  {step.data && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Test Data
                      </label>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded">
                        {step.data}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Expected Result
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {step.result}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!testCase.steps || testCase.steps.length === 0) && (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              No test steps defined
            </p>
          )}
        </div>
      </div>

      {/* Xray Links Section - Editable */}
      <XrayLinksEditor
        testCase={testCase}
        activeProject={activeProject}
        xrayEntitiesCache={xrayEntitiesCache}
        onLoadXrayEntities={onLoadXrayEntities}
        onLinksUpdated={onLinksUpdated}
        showToast={showToast}
        config={config}
      />
    </div>
  );
}

export default TestCasePreview;
