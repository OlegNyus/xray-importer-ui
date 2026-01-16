import { useState } from 'react';
import ConfigModal from './ConfigModal';

function Header({ isConfigured, config, darkMode, onToggleDarkMode, onReconfigure }) {
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9L8 13L14 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white">RayDrop</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={onToggleDarkMode}
            className="btn-icon"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17.5 10.5a7.5 7.5 0 01-9.9 7.1 7.5 7.5 0 01-5.1-9.9 7.5 7.5 0 009.9-5.1 7.5 7.5 0 005.1 7.9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          {/* Config button */}
          {isConfigured && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="btn-icon"
              title="View Configuration"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16.18 12.32a1.25 1.25 0 00.25 1.38l.05.05a1.52 1.52 0 01-1.07 2.59 1.52 1.52 0 01-1.07-.44l-.05-.05a1.25 1.25 0 00-1.38-.25 1.25 1.25 0 00-.76 1.15v.13a1.52 1.52 0 01-3.03 0v-.07a1.25 1.25 0 00-.82-1.15 1.25 1.25 0 00-1.38.25l-.05.05a1.52 1.52 0 11-2.15-2.15l.05-.05a1.25 1.25 0 00.25-1.38 1.25 1.25 0 00-1.15-.76h-.13a1.52 1.52 0 010-3.03h.07a1.25 1.25 0 001.15-.82 1.25 1.25 0 00-.25-1.38l-.05-.05a1.52 1.52 0 112.15-2.15l.05.05a1.25 1.25 0 001.38.25h.06a1.25 1.25 0 00.76-1.15v-.13a1.52 1.52 0 013.03 0v.07a1.25 1.25 0 00.76 1.15 1.25 1.25 0 001.38-.25l.05-.05a1.52 1.52 0 112.15 2.15l-.05.05a1.25 1.25 0 00-.25 1.38v.06a1.25 1.25 0 001.15.76h.13a1.52 1.52 0 010 3.03h-.07a1.25 1.25 0 00-1.15.76z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            <span>{isConfigured ? 'Connected to Xray' : 'Not configured'}</span>
          </div>
        </div>
      </header>

      {showConfigModal && (
        <ConfigModal
          config={config}
          onClose={() => setShowConfigModal(false)}
          onEdit={() => {
            setShowConfigModal(false);
            onReconfigure();
          }}
        />
      )}
    </>
  );
}

export default Header;
