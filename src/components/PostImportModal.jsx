import Modal from './Modal';

function PostImportModal({ onDelete, onKeep, onClose, isBulkImport, count }) {
  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Import Successful!
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          {isBulkImport
            ? `${count} test case${count > 1 ? 's were' : ' was'} successfully imported to Xray.`
            : 'Your test case was successfully imported to Xray.'}
        </p>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Would you like to delete {isBulkImport ? 'these test cases' : 'this test case'} from your local storage?
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 italic">
          This only affects your local files, not Xray.
        </p>
        <div className="flex gap-3">
          <button onClick={onKeep} className="btn btn-secondary flex-1">
            Keep (Mark as Imported)
          </button>
          <button onClick={onDelete} className="btn btn-danger flex-1">
            Delete from Local
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default PostImportModal;
