import { useState } from 'react';
import { saveConfig } from '../utils/api';

function SetupForm({ onComplete, onCancel, initialConfig, isEditing }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    xrayClientId: initialConfig?.xrayClientId || '',
    xrayClientSecret: initialConfig?.xrayClientSecret || '',
    jiraBaseUrl: initialConfig?.jiraBaseUrl || '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function validate() {
    const newErrors = {};

    if (!formData.xrayClientId.trim()) {
      newErrors.xrayClientId = 'Client ID is required';
    }

    if (!formData.xrayClientSecret.trim()) {
      newErrors.xrayClientSecret = 'Client Secret is required';
    }

    if (!formData.jiraBaseUrl.trim()) {
      newErrors.jiraBaseUrl = 'Jira Base URL is required';
    } else {
      try {
        new URL(formData.jiraBaseUrl);
      } catch {
        newErrors.jiraBaseUrl = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const result = await saveConfig(formData);

      if (result.success) {
        onComplete(formData);
      } else {
        setErrors({ submit: result.error || 'Failed to save configuration' });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save configuration' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isEditing ? 'Edit Configuration' : 'Welcome to RayDrop'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {isEditing
            ? 'Update your Xray Cloud credentials and Jira settings'
            : 'Configure your Xray Cloud credentials and Jira base URL'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Xray Credentials */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Xray Cloud Credentials</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="xrayClientId"
              value={formData.xrayClientId}
              onChange={handleChange}
              placeholder="Enter your Xray Client ID"
              className={`input ${errors.xrayClientId ? 'input-error' : ''}`}
            />
            {errors.xrayClientId && (
              <p className="text-red-500 text-sm mt-1">{errors.xrayClientId}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Found in Xray Cloud → Settings → API Keys
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="xrayClientSecret"
              value={formData.xrayClientSecret}
              onChange={handleChange}
              placeholder="Enter your Xray Client Secret"
              className={`input ${errors.xrayClientSecret ? 'input-error' : ''}`}
            />
            {errors.xrayClientSecret && (
              <p className="text-red-500 text-sm mt-1">{errors.xrayClientSecret}</p>
            )}
          </div>
        </div>

        {/* Jira Configuration */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Jira Configuration</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jira Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="jiraBaseUrl"
              value={formData.jiraBaseUrl}
              onChange={handleChange}
              placeholder="https://your-domain.atlassian.net/"
              className={`input ${errors.jiraBaseUrl ? 'input-error' : ''}`}
            />
            {errors.jiraBaseUrl && (
              <p className="text-red-500 text-sm mt-1">{errors.jiraBaseUrl}</p>
            )}
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        <div className={isEditing ? 'flex gap-3' : ''}>
          {isEditing && (
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
            disabled={loading}
            className={`btn btn-primary ${isEditing ? 'flex-1' : 'w-full'}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Validating...
              </>
            ) : (
              isEditing ? 'Update Configuration' : 'Validate & Save Configuration'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SetupForm;
