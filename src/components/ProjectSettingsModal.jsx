import { useState } from 'react';
import Modal from './Modal';
import ColorPicker, { PASTEL_COLORS } from './ColorPicker';
import {
  addProject as addProjectApi,
  hideProject as hideProjectApi,
  unhideProject as unhideProjectApi,
  saveProjectSettings,
} from '../utils/api';

function ProjectSettingsModal({
  projects,
  hiddenProjects,
  activeProject,
  projectSettings,
  onClose,
  onProjectsUpdated,
  showToast,
}) {
  const [newProjectKey, setNewProjectKey] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PASTEL_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [editingColor, setEditingColor] = useState(null); // projectKey being edited

  const visibleProjects = (projects || []).filter(p => !(hiddenProjects || []).includes(p));

  async function handleAddProject() {
    if (!newProjectKey.trim()) {
      setError('Project key is required');
      return;
    }

    if (!/^[A-Z]+$/.test(newProjectKey)) {
      setError('Must be uppercase letters only');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const result = await addProjectApi(newProjectKey, newProjectColor);
      if (result.success) {
        setNewProjectKey('');
        setNewProjectColor(PASTEL_COLORS[(projects.length + 1) % PASTEL_COLORS.length]);
        onProjectsUpdated();
        if (result.alreadyExists) {
          showToast(`Project ${newProjectKey} was already configured`);
        } else {
          showToast(`Project ${newProjectKey} added`);
        }
      } else {
        setError(result.error || 'Failed to add project');
      }
    } catch (err) {
      setError(err.message || 'Failed to add project');
    } finally {
      setAdding(false);
    }
  }

  async function handleColorChange(projectKey, newColor) {
    try {
      const currentSettings = projectSettings?.[projectKey] || {};
      await saveProjectSettings(projectKey, { ...currentSettings, color: newColor });
      onProjectsUpdated();
      setEditingColor(null);
    } catch (err) {
      showToast('Failed to update color');
    }
  }

  function getProjectColor(projectKey) {
    return projectSettings?.[projectKey]?.color || PASTEL_COLORS[0];
  }

  async function handleHideProject(projectKey) {
    try {
      await hideProjectApi(projectKey);
      onProjectsUpdated();
      showToast(`Project ${projectKey} hidden`);
    } catch (err) {
      showToast('Failed to hide project');
    }
  }

  async function handleUnhideProject(projectKey) {
    try {
      await unhideProjectApi(projectKey);
      onProjectsUpdated();
      showToast(`Project ${projectKey} restored`);
    } catch (err) {
      showToast('Failed to restore project');
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Manage Projects
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add or hide Jira projects
          </p>
        </div>

        {/* Add new project */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Add New Project
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectKey}
              onChange={(e) => {
                setNewProjectKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''));
                if (error) setError(null);
              }}
              placeholder="e.g. PROJ"
              className={`input flex-1 ${error ? 'input-error' : ''}`}
            />
            <button
              onClick={handleAddProject}
              disabled={adding || !newProjectKey.trim()}
              className="btn btn-primary"
            >
              {adding ? (
                <span className="spinner"></span>
              ) : (
                'Add'
              )}
            </button>
          </div>
          {newProjectKey && (
            <ColorPicker
              value={newProjectColor}
              onChange={setNewProjectColor}
            />
          )}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>

        {/* Visible projects */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Projects ({visibleProjects.length})
          </label>
          {visibleProjects.length === 0 ? (
            <p className="text-sm text-gray-400">No active projects</p>
          ) : (
            <div className="space-y-2">
              {visibleProjects.map((project) => (
                <div key={project} className="space-y-2">
                  <div
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingColor(editingColor === project ? null : project)}
                        className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: getProjectColor(project) }}
                        title="Change color"
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{project}</span>
                      {project === activeProject && (
                        <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {visibleProjects.length > 1 && (
                      <button
                        onClick={() => handleHideProject(project)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                        title="Hide project"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  {editingColor === project && (
                    <div className="pl-3">
                      <ColorPicker
                        value={getProjectColor(project)}
                        onChange={(color) => handleColorChange(project, color)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden projects */}
        {hiddenProjects && hiddenProjects.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transform transition-transform ${showHidden ? 'rotate-90' : ''}`}
              >
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Hidden Projects ({hiddenProjects.length})
            </button>
            {showHidden && (
              <div className="space-y-1 pl-4">
                {hiddenProjects.map((project) => (
                  <div
                    key={project}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-60"
                  >
                    <span className="text-gray-600 dark:text-gray-400">{project}</span>
                    <button
                      onClick={() => handleUnhideProject(project)}
                      className="text-primary-500 hover:text-primary-600 text-sm"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Close button */}
        <div className="pt-2 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ProjectSettingsModal;
