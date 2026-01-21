import Modal from './Modal';

function ConfigModal({ config, onClose, onEdit }) {
  return (
    <Modal onClose={onClose}>
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#6366f1" strokeWidth="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#6366f1" strokeWidth="1.5"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Your current Xray Cloud settings</p>
      </div>

      <div className="space-y-3 mb-6">
        <ConfigItem label="Client ID" value={config?.xrayClientId} truncate />
        <ConfigItem label="Client Secret" value={config?.xrayClientSecret} truncate />
        <ConfigItem label="Jira Base URL" value={config?.jiraBaseUrl} />
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="btn btn-secondary flex-1">
          Close
        </button>
        <button onClick={onEdit} className="btn btn-primary flex-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      </div>
    </Modal>
  );
}

function ConfigItem({ label, value, truncate }) {
  const displayValue = truncate && value && value.length > 12
    ? `${value.substring(0, 6)}...${value.substring(value.length - 6)}`
    : value;

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 dark:text-white font-mono">
        {displayValue || '-'}
      </span>
    </div>
  );
}

export default ConfigModal;
