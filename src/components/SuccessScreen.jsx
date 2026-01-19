import { useState } from 'react';
import PostImportModal from './PostImportModal';

function SuccessScreen({ result, config, onCreateAnother, onPostImportDelete, onPostImportKeep }) {
  const [showOutput, setShowOutput] = useState(false);
  const [showPostImportModal, setShowPostImportModal] = useState(true);
  const [postImportHandled, setPostImportHandled] = useState(false);

  const hasDraftIds = result?.draftId || result?.draftIds;
  const isBulkImport = result?.isBulkImport;
  const count = isBulkImport ? result?.draftIds?.length : 1;

  function handleDelete() {
    const ids = isBulkImport ? result.draftIds : result.draftId;
    onPostImportDelete(ids);
    setShowPostImportModal(false);
    setPostImportHandled(true);
  }

  function handleKeep() {
    const ids = isBulkImport ? result.draftIds : result.draftId;
    onPostImportKeep(ids);
    setShowPostImportModal(false);
    setPostImportHandled(true);
  }

  function handleClose() {
    // When modal is dismissed (clicked outside), mark as imported to prevent re-importing
    const ids = isBulkImport ? result.draftIds : result.draftId;
    if (ids) {
      onPostImportKeep(ids);
      setPostImportHandled(true);
    }
    setShowPostImportModal(false);
  }

  return (
    <div className="card p-8 text-center">
      <div className="w-18 h-18 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M11 18L16 23L25 13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Import Successful!
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-2">
        {isBulkImport
          ? `${count} test case${count > 1 ? 's have' : ' has'} been imported to Xray Cloud`
          : 'Your test case has been imported to Xray Cloud'}
      </p>

      {postImportHandled && (
        <p className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-center gap-1 mb-6">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Local storage updated
        </p>
      )}

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Job ID</span>
          <span className="font-mono text-sm text-gray-900 dark:text-white">
            {result?.jobId || 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Project</span>
          <span className="text-gray-900 dark:text-white">
            {config?.projectKey || 'N/A'}
          </span>
        </div>
        {isBulkImport && (
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Test Cases</span>
            <span className="text-gray-900 dark:text-white">{count}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Status</span>
          <span className="badge badge-success">Submitted</span>
        </div>
      </div>

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

      <button onClick={onCreateAnother} className="btn btn-success">
        Create Another Test Case
      </button>

      {/* Post Import Modal */}
      {showPostImportModal && hasDraftIds && (
        <PostImportModal
          onDelete={handleDelete}
          onKeep={handleKeep}
          onClose={handleClose}
          isBulkImport={isBulkImport}
          count={count}
        />
      )}
    </div>
  );
}

export default SuccessScreen;
