import { useState } from 'react';
import { addProject as addProjectApi } from '../utils/api';
import ColorPicker, { PASTEL_COLORS } from './ColorPicker';

function ProjectSetupForm({ onComplete, onCancel, isFirstProject }) {
  const [projectKey, setProjectKey] = useState('');
  const [color, setColor] = useState(PASTEL_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    // Force uppercase and remove non-letters
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    setProjectKey(value);
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!projectKey.trim()) {
      setError('Project key is required');
      return;
    }

    if (!/^[A-Z]+$/.test(projectKey)) {
      setError('Must be uppercase letters only');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await addProjectApi(projectKey, color);
      if (result.success) {
        onComplete(projectKey, result.alreadyExists);
      } else {
        setError(result.error || 'Failed to add project');
      }
    } catch (err) {
      setError(err.message || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#6366f1" strokeWidth="2"/>
            <path d="M12 8v8M8 12h8" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isFirstProject ? 'Add Your First Project' : 'Add Project'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {isFirstProject
            ? 'Enter the Jira project key where test cases will be imported'
            : 'Enter a new Jira project key'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Project Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={projectKey}
            onChange={handleChange}
            placeholder="e.g. PROJ"
            className={`input ${error ? 'input-error' : ''}`}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
          <p className="text-gray-400 text-xs mt-1">
            Uppercase letters only (matches your Jira project key)
          </p>
        </div>

        <ColorPicker
          value={color}
          onChange={setColor}
          label="Project Color"
        />

        <div className={isFirstProject ? '' : 'flex gap-3'}>
          {!isFirstProject && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !projectKey.trim()}
            className={`btn btn-primary ${isFirstProject ? 'w-full' : 'flex-1'}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Adding...
              </>
            ) : (
              'Add Project'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectSetupForm;
