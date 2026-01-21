import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as api from './utils/api';

vi.mock('./utils/api');
vi.mock('./components/Header', () => ({
  default: ({ isConfigured, darkMode, onToggleDarkMode, onReconfigure, projects, activeProject, onSelectProject }) => (
    <header data-testid="header">
      <span data-testid="is-configured">{isConfigured ? 'yes' : 'no'}</span>
      <span data-testid="dark-mode">{darkMode ? 'dark' : 'light'}</span>
      <span data-testid="active-project">{activeProject || 'none'}</span>
      <button data-testid="toggle-dark" onClick={onToggleDarkMode}>Toggle Dark</button>
      <button data-testid="reconfigure" onClick={onReconfigure}>Reconfigure</button>
      {projects?.map(p => (
        <button key={p} data-testid={`select-${p}`} onClick={() => onSelectProject(p)}>Select {p}</button>
      ))}
    </header>
  ),
}));
vi.mock('./components/SetupForm', () => ({
  default: ({ onComplete }) => (
    <div data-testid="setup-form">
      <button onClick={() => onComplete({ xrayClientId: 'id', xrayClientSecret: 'secret', jiraBaseUrl: 'https://test.atlassian.net' })}>
        Complete Setup
      </button>
    </div>
  ),
}));
vi.mock('./components/ProjectSetupForm', () => ({
  default: ({ onComplete, isFirstProject }) => (
    <div data-testid="project-setup-form">
      <span data-testid="is-first-project">{isFirstProject ? 'yes' : 'no'}</span>
      <button onClick={() => onComplete('TEST', false)}>Add Project</button>
    </div>
  ),
}));
vi.mock('./components/TestCaseBuilder', () => ({
  default: ({ onImportSuccess, onImportError, showToast, activeProject }) => (
    <div data-testid="test-case-builder">
      <span data-testid="builder-project">{activeProject || 'none'}</span>
      <button onClick={() => onImportSuccess({ jobId: 'job-123', draftIds: ['d1', 'd2'] })}>
        Import Success
      </button>
      <button onClick={() => onImportError({ error: 'Import failed' })}>
        Import Error
      </button>
      <button onClick={() => showToast('Test toast')}>Show Toast</button>
    </div>
  ),
}));
vi.mock('./components/SuccessScreen', () => ({
  default: ({ result, onCreateAnother, onPostImportDelete, onPostImportKeep }) => (
    <div data-testid="success-screen">
      <span data-testid="result-jobid">{result?.jobId}</span>
      <button data-testid="create-another" onClick={onCreateAnother}>Create Another</button>
      <button data-testid="delete-drafts" onClick={() => onPostImportDelete(result?.draftIds)}>Delete Drafts</button>
      <button data-testid="keep-drafts" onClick={() => onPostImportKeep(result?.draftIds)}>Keep Drafts</button>
      <button data-testid="delete-single" onClick={() => onPostImportDelete('single-id')}>Delete Single</button>
      <button data-testid="keep-single" onClick={() => onPostImportKeep('single-id')}>Keep Single</button>
    </div>
  ),
}));
vi.mock('./components/ErrorScreen', () => ({
  default: ({ result, onBackToBuilder, onReconfigure }) => (
    <div data-testid="error-screen">
      <span data-testid="error-message">{result?.error}</span>
      <button data-testid="back-to-builder" onClick={onBackToBuilder}>Back</button>
      <button data-testid="error-reconfigure" onClick={onReconfigure}>Reconfigure</button>
    </div>
  ),
}));
vi.mock('./components/Toast', () => ({
  default: ({ message, onClose }) => (
    <div data-testid="toast">
      <span>{message}</span>
      <button data-testid="close-toast" onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock('./components/Modal', () => ({
  default: ({ children, onClose }) => (
    <div data-testid="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  ),
}));
vi.mock('./components/ProjectSettingsModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="project-settings-modal">
      <button data-testid="close-project-settings" onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('App', () => {
  // Config no longer includes projectKey - that's separate now
  const completeConfig = {
    xrayClientId: 'id',
    xrayClientSecret: 'secret',
    jiraBaseUrl: 'https://test.atlassian.net',
  };

  const projectsResponse = {
    projects: ['TEST'],
    hiddenProjects: [],
    activeProject: 'TEST',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.fetchConfig.mockResolvedValue({ exists: false });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    api.setActiveProject.mockResolvedValue({ success: true });
    api.deleteDraft.mockResolvedValue({ success: true });
    api.updateDraftStatus.mockResolvedValue({ success: true });
    api.migrateDrafts.mockResolvedValue({ success: true, migrated: 2 });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show welcome screen when no config exists', async () => {
    api.fetchConfig.mockResolvedValue({ exists: false });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });
  });

  it('should show welcome screen when config is incomplete', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: { xrayClientId: 'id' } });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });
  });

  it('should show project setup when config complete but no projects', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue({ projects: [], hiddenProjects: [], activeProject: null });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('project-setup-form')).toBeInTheDocument();
      expect(screen.getByTestId('is-first-project')).toHaveTextContent('yes');
    });
  });

  it('should show builder screen when config and projects exist', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
      expect(screen.getByTestId('builder-project')).toHaveTextContent('TEST');
    });
  });

  it('should show welcome screen on config fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.fetchConfig.mockRejectedValue(new Error('Network error'));
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('should navigate to project setup after credentials setup complete', async () => {
    api.fetchConfig.mockResolvedValue({ exists: false });
    api.fetchProjects.mockResolvedValue({ projects: [], hiddenProjects: [], activeProject: null });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete Setup'));

    await waitFor(() => {
      expect(screen.getByTestId('project-setup-form')).toBeInTheDocument();
      expect(screen.getByTestId('is-configured')).toHaveTextContent('yes');
    });
  });

  it('should navigate to builder after project setup complete', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue({ projects: [], hiddenProjects: [], activeProject: null });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('project-setup-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Project'));

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });
  });

  it('should navigate to success screen on import success', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));

    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
      expect(screen.getByTestId('result-jobid')).toHaveTextContent('job-123');
    });
  });

  it('should navigate to error screen on import error', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Error'));

    await waitFor(() => {
      expect(screen.getByTestId('error-screen')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Import failed');
    });
  });

  it('should navigate back to builder from error screen', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Error'));
    await waitFor(() => {
      expect(screen.getByTestId('error-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('back-to-builder'));
    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });
  });

  it('should navigate to welcome from error screen reconfigure', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Error'));
    await waitFor(() => {
      expect(screen.getByTestId('error-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('error-reconfigure'));
    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });
  });

  it('should navigate back to builder from success screen', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('create-another'));
    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });
  });

  it('should handle reconfigure from header (edit mode)', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('reconfigure'));

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
      // isConfigured stays true when editing existing config
      expect(screen.getByTestId('is-configured')).toHaveTextContent('yes');
    });
  });

  // Dark mode tests
  it('should start in light mode by default', async () => {
    api.fetchConfig.mockResolvedValue({ exists: false });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('light');
    });
  });

  it('should toggle dark mode', async () => {
    api.fetchConfig.mockResolvedValue({ exists: false });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toggle-dark'));

    await waitFor(() => {
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark');
    });
  });

  // Toast tests
  it('should show and close toast', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Toast'));

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('close-toast'));

    await waitFor(() => {
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });
  });

  // Post-import actions
  it('should handle post-import delete for array of draft IDs', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-drafts'));

    await waitFor(() => {
      expect(api.deleteDraft).toHaveBeenCalledWith('d1');
      expect(api.deleteDraft).toHaveBeenCalledWith('d2');
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });
  });

  it('should handle post-import delete for single draft ID', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-single'));

    await waitFor(() => {
      expect(api.deleteDraft).toHaveBeenCalledWith('single-id');
    });
  });

  it('should handle post-import delete error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.deleteDraft.mockRejectedValue(new Error('Delete failed'));
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-single'));

    await waitFor(() => {
      expect(screen.getByText('Failed to delete test case(s)')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('should handle post-import keep for array of draft IDs', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('keep-drafts'));

    await waitFor(() => {
      expect(api.updateDraftStatus).toHaveBeenCalledWith('d1', 'imported');
      expect(api.updateDraftStatus).toHaveBeenCalledWith('d2', 'imported');
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });
  });

  it('should handle post-import keep for single draft ID', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('keep-single'));

    await waitFor(() => {
      expect(api.updateDraftStatus).toHaveBeenCalledWith('single-id', 'imported');
    });
  });

  it('should handle post-import keep error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.updateDraftStatus.mockRejectedValue(new Error('Update failed'));
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Success'));
    await waitFor(() => {
      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('keep-single'));

    await waitFor(() => {
      expect(screen.getByText('Failed to update test case(s)')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('should not show migration modal when localStorage has empty array', async () => {
    localStorage.setItem('raydrop_saved_test_cases', JSON.stringify([]));
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue(projectsResponse);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
    });

    expect(screen.queryByText('Migrate Existing Data')).not.toBeInTheDocument();
  });

  it('should render footer', async () => {
    api.fetchConfig.mockResolvedValue({ exists: false });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/RayDrop/)).toBeInTheDocument();
    });
  });

  it('should check isConfigComplete returns false for null config', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: null });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument();
    });
  });

  // Project switching tests
  it('should switch active project', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue({
      projects: ['TEST', 'DEMO'],
      hiddenProjects: [],
      activeProject: 'TEST',
    });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('test-case-builder')).toBeInTheDocument();
      expect(screen.getByTestId('active-project')).toHaveTextContent('TEST');
    });

    fireEvent.click(screen.getByTestId('select-DEMO'));

    await waitFor(() => {
      expect(api.setActiveProject).toHaveBeenCalledWith('DEMO');
    });
  });

  it('should show project setup when all projects are hidden', async () => {
    api.fetchConfig.mockResolvedValue({ exists: true, config: completeConfig });
    api.fetchProjects.mockResolvedValue({
      projects: ['TEST'],
      hiddenProjects: ['TEST'],
      activeProject: null,
    });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('project-setup-form')).toBeInTheDocument();
    });
  });
});
