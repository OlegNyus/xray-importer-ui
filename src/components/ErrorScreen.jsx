function ErrorScreen({ result, onBackToBuilder, onReconfigure }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-18 h-18 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M13 13l10 10M23 13l-10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Import Failed
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {result?.error?.includes('credentials')
          ? 'Authentication failed. Please check your credentials.'
          : 'There was a problem importing your test case.'}
      </p>

      {/* Error details */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-medium">Error Details</span>
        </div>
        <code className="text-sm text-red-700 dark:text-red-300 block">
          {result?.error || 'Unknown error occurred'}
        </code>
      </div>

      <div className="flex gap-3">
        <button onClick={onBackToBuilder} className="btn btn-secondary flex-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Builder
        </button>
        <button onClick={onReconfigure} className="btn btn-danger flex-1">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M4.22 13.78l1.42-1.42M12.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Reconfigure Credentials
        </button>
      </div>
    </div>
  );
}

export default ErrorScreen;
