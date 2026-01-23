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

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      Imported: {
        light: 'bg-emerald-100 border-emerald-200 text-emerald-700',
        dark: 'dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400',
        icon: '✓'
      },
      Draft: {
        light: 'bg-amber-100 border-amber-200 text-amber-700',
        dark: 'dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400',
        icon: '○'
      },
      Failed: {
        light: 'bg-red-100 border-red-200 text-red-700',
        dark: 'dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-400',
        icon: '✕'
      }
    };
    const cfg = statusConfig[status] || statusConfig.Draft;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.light} ${cfg.dark}`}>
        <span>{cfg.icon}</span>
        {status}
      </span>
    );
  };

  const MetadataTag = ({ children, variant = 'default' }) => {
    const variants = {
      default: 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-slate-300',
      priority: {
        High: 'bg-red-100 border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-400',
        Medium: 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400',
        Low: 'bg-green-100 border-green-200 text-green-700 dark:bg-green-500/20 dark:border-green-500/30 dark:text-green-400',
      },
      label: 'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-500/20 dark:border-purple-500/30 dark:text-purple-400'
    };

    let classes = variants.default;
    if (variant === 'label') {
      classes = variants.label;
    } else if (variant === 'priority' && typeof children === 'string') {
      classes = variants.priority[children] || variants.default;
    }

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-medium ${classes}`}>
        {children}
      </span>
    );
  };

  const StepField = ({ label, value, placeholder, isMono = false }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 min-h-[40px] w-full">
        {value ? (
          <span className={`text-gray-900 dark:text-slate-300 text-sm whitespace-pre-wrap ${isMono ? 'font-mono' : ''}`}>{value}</span>
        ) : (
          <span className="text-gray-400 dark:text-slate-500 text-sm italic">{placeholder || 'Not specified'}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Test Case ID */}
            {testCase.testKey && (
              <a
                href={`${jiraBaseUrl}/browse/${testCase.testKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600/50 hover:bg-gray-200 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all duration-200"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-mono text-sm font-semibold text-primary-600 dark:text-purple-400">{testCase.testKey}</span>
              </a>
            )}

            {/* Status Badge */}
            <StatusBadge status={testCase.testKey ? 'Imported' : 'Draft'} />

            {/* Timestamp */}
            {testCase.importedAt && (
              <span className="text-sm text-gray-500 dark:text-slate-500 ml-auto">
                Imported on {new Date(testCase.importedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Title Section */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700/50">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{testCase.summary}</h1>
        </div>

        {/* Details Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Description */}
            <div className="bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wide">Description</h3>
              </div>
              <div className="flex items-center px-3 py-2 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 min-h-[40px] w-full">
                {testCase.description ? (
                  <span className="text-gray-900 dark:text-slate-300 text-sm whitespace-pre-wrap">{testCase.description}</span>
                ) : (
                  <span className="text-gray-400 dark:text-slate-500 text-sm italic">No description</span>
                )}
              </div>
            </div>

            {/* Metadata Row */}
            <div className="bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Test Type */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wide">Test Type</span>
                  </div>
                  <MetadataTag>{testCase.testType || 'Manual'}</MetadataTag>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wide">Priority</span>
                  </div>
                  <MetadataTag variant="priority">{testCase.priority || 'Medium'}</MetadataTag>
                </div>

                {/* Labels */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wide">Labels</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {testCase.labels?.length > 0 ? (
                      testCase.labels.map((label, index) => (
                        <MetadataTag key={index} variant="label">{label}</MetadataTag>
                      ))
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500 text-sm italic">No labels</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Steps Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Test Steps</h2>
            <span className="text-xs text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full">
              {testCase.steps?.length || 0}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-4">
            {testCase.steps?.map((step, index) => (
              <div
                key={step.id || index}
                className="bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5"
              >
                <div className="flex gap-4">
                  {/* Step Number Badge */}
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 dark:bg-purple-500/20 border border-primary-200 dark:border-purple-500/30 text-primary-600 dark:text-purple-400 text-sm font-semibold flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Step Fields - Vertical Layout */}
                  <div className="flex-1 min-w-0 space-y-4">
                    <StepField
                      label="Action"
                      value={step.action}
                      placeholder="No action defined"
                    />
                    <StepField
                      label="Test Data"
                      value={step.data}
                      placeholder="No test data"
                      isMono
                    />
                    <StepField
                      label="Expected Result"
                      value={step.result}
                      placeholder="No expected result"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!testCase.steps || testCase.steps.length === 0) && (
              <div className="flex items-center justify-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                No test steps defined
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Xray Links Section */}
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
