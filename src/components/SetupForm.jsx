import { useState } from 'react';
import { saveConfig } from '../utils/api';

function SetupForm({ onComplete, initialConfig }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    xrayClientId: '',
    xrayClientSecret: '',
    jiraBaseUrl: initialConfig?.jiraBaseUrl || 'https://whelen.atlassian.net/',
    projectKey: initialConfig?.projectKey || 'WCP',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    let newValue = value;

    // Force uppercase for project key
    if (name === 'projectKey') {
      newValue = value.toUpperCase().replace(/[^A-Z]/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

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

    if (!formData.projectKey.trim()) {
      newErrors.projectKey = 'Project Key is required';
    } else if (!/^[A-Z]+$/.test(formData.projectKey)) {
      newErrors.projectKey = 'Must be uppercase letters only';
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
      setErrors({ submit: 'Failed to save configuration' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to RayDrop
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure your Xray Cloud credentials to get started
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
              type="password"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="projectKey"
                value={formData.projectKey}
                onChange={handleChange}
                placeholder="e.g. WCP"
                className={`input ${errors.projectKey ? 'input-error' : ''}`}
              />
              {errors.projectKey && (
                <p className="text-red-500 text-sm mt-1">{errors.projectKey}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">Uppercase only</p>
            </div>
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Validating...
            </>
          ) : (
            'Validate & Save Configuration'
          )}
        </button>
      </form>
    </div>
  );
}

export default SetupForm;
