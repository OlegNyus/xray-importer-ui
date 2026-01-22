import { useState } from 'react';

function SuccessScreen({ result, config, onCreateAnother, onPostImportDelete, onPostImportKeep }) {
  const [showOutput, setShowOutput] = useState(false);
  const [postImportHandled, setPostImportHandled] = useState(false);
  const [deletedFromLocal, setDeletedFromLocal] = useState(false);

  const hasDraftIds = result?.draftId || result?.draftIds;
  const isBulkImport = result?.isBulkImport;
  const count = isBulkImport ? result?.draftIds?.length : 1;

  // Get test key(s) from result
  const testKey = result?.testKey;
  const testKeys = result?.testKeys;
  const displayKeys = isBulkImport ? testKeys : (testKey ? [testKey] : []);

  function handleDelete() {
    const ids = isBulkImport ? result.draftIds : result.draftId;
    onPostImportDelete(ids);
    setPostImportHandled(true);
    setDeletedFromLocal(true);
  }

  function handleKeep() {
    const ids = isBulkImport ? result.draftIds : result.draftId;
    onPostImportKeep(ids);
    setPostImportHandled(true);
    setDeletedFromLocal(false);
  }

  return (
    <div className="card p-8 text-center max-w-lg mx-auto">
      {/* Success Icon */}
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M9 16L14 21L23 11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Import Successful!
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {isBulkImport
          ? `${count} test case${count > 1 ? 's have' : ' has'} been imported to Xray Cloud`
          : 'Your test case has been imported to Xray Cloud'}
      </p>

      {/* Import Details */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
        {/* Test Key(s) - most important info */}
        {displayKeys.length > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {isBulkImport ? 'Test Keys' : 'Test Key'}
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {displayKeys.slice(0, 3).join(', ')}
              {displayKeys.length > 3 && ` +${displayKeys.length - 3} more`}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Project</span>
          <span className="text-gray-900 dark:text-white">
            {config?.projectKey || 'N/A'}
          </span>
        </div>
        {isBulkImport && (
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Count</span>
            <span className="text-gray-900 dark:text-white">{count} test case{count > 1 ? 's' : ''}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Status</span>
          <span className="badge badge-success">Imported</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Job ID</span>
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={result?.jobId}>
            {result?.jobId || 'N/A'}
          </span>
        </div>
      </div>

      {/* Local Storage Section */}
      {hasDraftIds && !postImportHandled && (
        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            What would you like to do with the local draft?
          </p>
          <div className="flex gap-2">
            <button onClick={handleKeep} className="btn btn-secondary btn-sm flex-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Keep Local Copy
            </button>
            <button onClick={handleDelete} className="btn btn-ghost btn-sm flex-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Delete Local
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
            This only affects your local files, not Xray.
          </p>
        </div>
      )}

      {/* Post-action feedback */}
      {postImportHandled && (
        <p className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-center gap-1 mb-6">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {deletedFromLocal ? 'Local draft deleted' : 'Marked as imported'}
        </p>
      )}

      {/* Output toggle */}
      {result?.output && (
        <div className="mb-6">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mx-auto"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${showOutput ? 'rotate-180' : ''}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View Script Output
          </button>

          {showOutput && (
            <div className="mt-3 bg-gray-900 rounded-lg p-4 text-left overflow-auto max-h-64">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {result.output}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Primary Action */}
      <button onClick={onCreateAnother} className="btn btn-primary w-full">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Create Another Test Case
      </button>
    </div>
  );
}

export default SuccessScreen;
