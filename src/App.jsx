import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SetupForm from './components/SetupForm';
import ProjectSetupForm from './components/ProjectSetupForm';
import TestCaseBuilder from './components/TestCaseBuilder';
import SuccessScreen from './components/SuccessScreen';
import ErrorScreen from './components/ErrorScreen';
import Toast from './components/Toast';
import Modal from './components/Modal';
import ProjectSettingsModal from './components/ProjectSettingsModal';
import {
  fetchConfig,
  fetchProjects,
  setActiveProject as setActiveProjectApi,
  deleteDraft,
  updateDraftStatus,
  migrateDrafts,
} from './utils/api';
import { version } from '../package.json';

const STORAGE_KEY = 'raydrop_saved_test_cases';

const SCREENS = {
  WELCOME: 'welcome',
  PROJECT_SETUP: 'project_setup',
  BUILDER: 'builder',
  SUCCESS: 'success',
  ERROR: 'error',
};

function App() {
  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [config, setConfig] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationData, setMigrationData] = useState(null);
  const [migrating, setMigrating] = useState(false);

  // Project state
  const [projects, setProjects] = useState([]);
  const [hiddenProjects, setHiddenProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [projectSettings, setProjectSettings] = useState({});
  const [showProjectSettings, setShowProjectSettings] = useState(false);

  // Check for existing config on mount
  useEffect(() => {
    checkConfig();
  }, []);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  async function checkConfig() {
    try {
      const result = await fetchConfig();
      if (result.exists && isConfigComplete(result.config)) {
        setConfig(result.config);
        setIsConfigured(true);

        // Check for projects
        await checkProjects();
      } else {
        // Config missing or incomplete - show welcome page
        setScreen(SCREENS.WELCOME);
      }
    } catch (error) {
      console.error('Failed to check config:', error);
      setScreen(SCREENS.WELCOME);
    }
  }

  async function checkProjects() {
    try {
      const result = await fetchProjects();
      setProjects(result.projects || []);
      setHiddenProjects(result.hiddenProjects || []);
      setActiveProject(result.activeProject);
      setProjectSettings(result.projectSettings || {});

      // Get visible projects
      const visibleProjects = (result.projects || []).filter(
        p => !(result.hiddenProjects || []).includes(p)
      );

      if (visibleProjects.length === 0) {
        // No projects - show project setup
        setScreen(SCREENS.PROJECT_SETUP);
      } else {
        // Has projects - go to builder
        setScreen(SCREENS.BUILDER);
        // Check for localStorage migration
        checkMigration();
      }
    } catch (error) {
      console.error('Failed to check projects:', error);
      setScreen(SCREENS.PROJECT_SETUP);
    }
  }

  // Check if all required config fields are present (no projectKey now)
  function isConfigComplete(config) {
    if (!config) return false;
    return !!(
      config.xrayClientId &&
      config.xrayClientSecret &&
      config.jiraBaseUrl
    );
  }

  function checkMigration() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data) && data.length > 0) {
          setMigrationData(data);
          setShowMigrationModal(true);
        }
      } catch (e) {
        // Invalid data, clear it
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  async function handleMigrate() {
    if (!migrationData) return;

    setMigrating(true);
    try {
      const result = await migrateDrafts(migrationData);
      if (result.success) {
        localStorage.removeItem(STORAGE_KEY);
        showToast(`Migrated ${result.migrated} test case(s) to file storage`);
        setShowMigrationModal(false);
        setMigrationData(null);
        // Refresh the page to reload drafts
        window.location.reload();
      } else {
        showToast(result.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      showToast('Migration failed');
    } finally {
      setMigrating(false);
    }
  }

  function handleSkipMigration() {
    setShowMigrationModal(false);
    setMigrationData(null);
  }

  function handleClearOldData() {
    localStorage.removeItem(STORAGE_KEY);
    setShowMigrationModal(false);
    setMigrationData(null);
    showToast('Old data cleared');
  }

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  function handleSetupComplete(newConfig) {
    setConfig(newConfig);
    setIsConfigured(true);
    setIsEditingConfig(false);
    // After credentials, check if we have projects
    checkProjects();
  }

  async function handleProjectSetupComplete(projectKey, alreadyExists) {
    // Fetch fresh project data from server (includes the color)
    try {
      const result = await fetchProjects();
      setProjects(result.projects || []);
      setHiddenProjects(result.hiddenProjects || []);
      setActiveProject(result.activeProject);
      setProjectSettings(result.projectSettings || {});
    } catch (error) {
      console.error('Failed to refresh projects:', error);
      // Fallback: at least update projects list
      if (!projects.includes(projectKey)) {
        setProjects([...projects, projectKey]);
      }
      setActiveProject(projectKey);
    }

    setScreen(SCREENS.BUILDER);
    if (alreadyExists) {
      showToast(`Project ${projectKey} was already configured`);
    } else {
      showToast(`Project ${projectKey} added successfully`);
    }
  }

  function handleCancelEdit() {
    setIsEditingConfig(false);
    setScreen(SCREENS.BUILDER);
  }

  function handleImportSuccess(result) {
    setLastResult(result);
    setScreen(SCREENS.SUCCESS);
  }

  function handleImportError(result) {
    setLastResult(result);
    setScreen(SCREENS.ERROR);
  }

  function handleReconfigure() {
    setIsEditingConfig(true);
    setScreen(SCREENS.WELCOME);
  }

  function handleCreateAnother() {
    setScreen(SCREENS.BUILDER);
  }

  async function handleSelectProject(projectKey) {
    try {
      await setActiveProjectApi(projectKey);
      setActiveProject(projectKey);
    } catch (error) {
      console.error('Failed to set active project:', error);
      showToast('Failed to switch project');
    }
  }

  function handleOpenProjectSettings() {
    setShowProjectSettings(true);
  }

  function handleProjectSettingsClose() {
    setShowProjectSettings(false);
  }

  async function handleProjectsUpdated() {
    // Refresh projects after settings change
    try {
      const result = await fetchProjects();
      setProjects(result.projects || []);
      setHiddenProjects(result.hiddenProjects || []);
      setActiveProject(result.activeProject);
      setProjectSettings(result.projectSettings || {});

      // Check if we still have visible projects
      const visibleProjects = (result.projects || []).filter(
        p => !(result.hiddenProjects || []).includes(p)
      );
      if (visibleProjects.length === 0) {
        setScreen(SCREENS.PROJECT_SETUP);
      }
    } catch (error) {
      console.error('Failed to refresh projects:', error);
    }
  }

  async function handlePostImportDelete(draftIds) {
    try {
      if (Array.isArray(draftIds)) {
        for (const id of draftIds) {
          await deleteDraft(id);
        }
      } else {
        await deleteDraft(draftIds);
      }
      showToast('Test case(s) deleted from local storage');
    } catch (error) {
      console.error('Failed to delete drafts:', error);
      showToast('Failed to delete test case(s)');
    }
    setScreen(SCREENS.BUILDER);
  }

  async function handlePostImportKeep(draftIds) {
    try {
      if (Array.isArray(draftIds)) {
        for (const id of draftIds) {
          await updateDraftStatus(id, 'imported');
        }
      } else {
        await updateDraftStatus(draftIds, 'imported');
      }
      showToast('Test case(s) marked as imported');
    } catch (error) {
      console.error('Failed to update draft status:', error);
      showToast('Failed to update test case(s)');
    }
    setScreen(SCREENS.BUILDER);
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-gray-100 via-purple-50 to-red-50'}`}>
      <Header
        isConfigured={isConfigured}
        config={config}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onReconfigure={handleReconfigure}
        projects={projects}
        hiddenProjects={hiddenProjects}
        activeProject={activeProject}
        projectSettings={projectSettings}
        onSelectProject={handleSelectProject}
        onOpenProjectSettings={handleOpenProjectSettings}
      />

      <main className="flex-1 p-3 sm:p-6 flex justify-center items-start">
        <div className="w-full max-w-3xl animate-fade-in">
          {screen === SCREENS.WELCOME && (
            <SetupForm
              onComplete={handleSetupComplete}
              onCancel={handleCancelEdit}
              initialConfig={config}
              isEditing={isEditingConfig}
            />
          )}

          {screen === SCREENS.PROJECT_SETUP && (
            <ProjectSetupForm
              onComplete={handleProjectSetupComplete}
              isFirstProject={projects.length === 0}
            />
          )}

          {screen === SCREENS.BUILDER && (
            <TestCaseBuilder
              config={config}
              activeProject={activeProject}
              onImportSuccess={handleImportSuccess}
              onImportError={handleImportError}
              showToast={showToast}
            />
          )}

          {screen === SCREENS.SUCCESS && (
            <SuccessScreen
              result={lastResult}
              config={config}
              onCreateAnother={handleCreateAnother}
              onPostImportDelete={handlePostImportDelete}
              onPostImportKeep={handlePostImportKeep}
            />
          )}

          {screen === SCREENS.ERROR && (
            <ErrorScreen
              result={lastResult}
              onBackToBuilder={() => setScreen(SCREENS.BUILDER)}
              onReconfigure={handleReconfigure}
            />
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-700">
        RayDrop &bull; v{version}
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Migration Modal */}
      {showMigrationModal && (
        <Modal onClose={handleSkipMigration}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Migrate Existing Data
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Found {migrationData?.length} test case(s) saved in browser storage.
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Would you like to migrate them to file-based storage? This will make them persist across browsers.
            </p>
            <div className="flex gap-3">
              <button onClick={handleClearOldData} className="btn btn-ghost flex-1">
                Clear Old Data
              </button>
              <button onClick={handleSkipMigration} className="btn btn-secondary flex-1">
                Skip
              </button>
              <button onClick={handleMigrate} disabled={migrating} className="btn btn-primary flex-1">
                {migrating ? (
                  <>
                    <span className="spinner"></span>
                    Migrating...
                  </>
                ) : (
                  'Migrate'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Project Settings Modal */}
      {showProjectSettings && (
        <ProjectSettingsModal
          projects={projects}
          hiddenProjects={hiddenProjects}
          activeProject={activeProject}
          projectSettings={projectSettings}
          onClose={handleProjectSettingsClose}
          onProjectsUpdated={handleProjectsUpdated}
          showToast={showToast}
        />
      )}
    </div>
  );
}

export default App;
