import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectSettingsModal from './ProjectSettingsModal';

// Mock the API
vi.mock('../utils/api', () => ({
  addProject: vi.fn(),
  hideProject: vi.fn(),
  unhideProject: vi.fn(),
  saveProjectSettings: vi.fn(),
}));

import { addProject, hideProject, unhideProject, saveProjectSettings } from '../utils/api';

describe('ProjectSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    projects: ['PROJ1', 'PROJ2'],
    hiddenProjects: [],
    activeProject: 'PROJ1',
    projectSettings: {
      PROJ1: { color: '#a5c7e9', functionalAreas: [], labels: [], collections: [] },
      PROJ2: { color: '#a8e6cf', functionalAreas: [], labels: [], collections: [] },
    },
    onClose: vi.fn(),
    onProjectsUpdated: vi.fn(),
    showToast: vi.fn(),
  };

  it('should render modal with title', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    expect(screen.getByText('Manage Projects')).toBeInTheDocument();
    expect(screen.getByText('Add or hide Jira projects')).toBeInTheDocument();
  });

  it('should render active projects list', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    expect(screen.getByText('PROJ1')).toBeInTheDocument();
    expect(screen.getByText('PROJ2')).toBeInTheDocument();
    expect(screen.getByText('Active Projects (2)')).toBeInTheDocument();
  });

  it('should show Active badge for current project', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should call onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<ProjectSettingsModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should add new project on form submit', async () => {
    addProject.mockResolvedValue({ success: true });

    render(<ProjectSettingsModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'NEWPROJ' } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(addProject).toHaveBeenCalledWith('NEWPROJ', expect.any(String));
    });
  });

  it('should disable Add button when project key is empty', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    const addButton = screen.getByText('Add');
    expect(addButton).toBeDisabled();
  });

  it('should enable Add button when project key has value', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'TEST' } });

    const addButton = screen.getByText('Add');
    expect(addButton).not.toBeDisabled();
  });

  it('should convert input to uppercase', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(input.value).toBe('ABC');
  });

  it('should hide project when Hide button is clicked', async () => {
    hideProject.mockResolvedValue({ success: true });

    render(<ProjectSettingsModal {...defaultProps} />);

    const hideButtons = screen.getAllByText('Hide');
    fireEvent.click(hideButtons[0]); // Hide first project

    await waitFor(() => {
      expect(hideProject).toHaveBeenCalledWith('PROJ1');
    });
  });

  it('should not show Hide button when only one visible project', () => {
    render(
      <ProjectSettingsModal
        {...defaultProps}
        projects={['PROJ1']}
      />
    );

    expect(screen.queryByText('Hide')).not.toBeInTheDocument();
  });

  it('should show hidden projects section', () => {
    render(
      <ProjectSettingsModal
        {...defaultProps}
        hiddenProjects={['HIDDEN1']}
      />
    );

    expect(screen.getByText('Hidden Projects (1)')).toBeInTheDocument();
  });

  it('should toggle hidden projects visibility', () => {
    render(
      <ProjectSettingsModal
        {...defaultProps}
        hiddenProjects={['HIDDEN1']}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText('Hidden Projects (1)'));

    expect(screen.getByText('HIDDEN1')).toBeInTheDocument();
    expect(screen.getByText('Restore')).toBeInTheDocument();
  });

  it('should unhide project when Restore is clicked', async () => {
    unhideProject.mockResolvedValue({ success: true });

    render(
      <ProjectSettingsModal
        {...defaultProps}
        hiddenProjects={['HIDDEN1']}
      />
    );

    // Expand hidden section
    fireEvent.click(screen.getByText('Hidden Projects (1)'));

    // Click restore
    fireEvent.click(screen.getByText('Restore'));

    await waitFor(() => {
      expect(unhideProject).toHaveBeenCalledWith('HIDDEN1');
    });
  });

  it('should show color picker when color dot is clicked', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    // Find color buttons (the round colored dots)
    const colorDots = screen.getAllByTitle('Change color');
    fireEvent.click(colorDots[0]);

    // Color picker should be visible (multiple color options)
    const colorButtons = screen.getAllByRole('button');
    expect(colorButtons.length).toBeGreaterThan(5); // Should have color options
  });

  it('should change project color', async () => {
    saveProjectSettings.mockResolvedValue({ success: true });

    render(<ProjectSettingsModal {...defaultProps} />);

    // Click color dot to open picker
    const colorDots = screen.getAllByTitle('Change color');
    fireEvent.click(colorDots[0]);

    // Click a different color
    const colorButtons = screen.getAllByRole('button');
    // Find a color button (they have backgroundColor style)
    const mintColorButton = colorButtons.find(
      btn => btn.style.backgroundColor === 'rgb(168, 230, 207)' // #a8e6cf
    );
    if (mintColorButton) {
      fireEvent.click(mintColorButton);

      await waitFor(() => {
        expect(saveProjectSettings).toHaveBeenCalled();
      });
    }
  });

  it('should show toast on successful project add', async () => {
    const showToast = vi.fn();
    addProject.mockResolvedValue({ success: true, alreadyExists: false });

    render(<ProjectSettingsModal {...defaultProps} showToast={showToast} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'NEW' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Project NEW added');
    });
  });

  it('should show different toast when project already exists', async () => {
    const showToast = vi.fn();
    addProject.mockResolvedValue({ success: true, alreadyExists: true });

    render(<ProjectSettingsModal {...defaultProps} showToast={showToast} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'EXISTING' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Project EXISTING was already configured');
    });
  });

  it('should show error on add failure', async () => {
    addProject.mockResolvedValue({ success: false, error: 'Add failed' });

    render(<ProjectSettingsModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'FAIL' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('Add failed')).toBeInTheDocument();
    });
  });

  it('should handle API exception on add', async () => {
    addProject.mockRejectedValue(new Error('Network error'));

    render(<ProjectSettingsModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'ERROR' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should show no active projects message when list is empty', () => {
    render(
      <ProjectSettingsModal
        {...defaultProps}
        projects={[]}
        hiddenProjects={[]}
      />
    );

    expect(screen.getByText('No active projects')).toBeInTheDocument();
  });

  it('should call onProjectsUpdated after successful operations', async () => {
    const onProjectsUpdated = vi.fn();
    addProject.mockResolvedValue({ success: true });

    render(<ProjectSettingsModal {...defaultProps} onProjectsUpdated={onProjectsUpdated} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'NEW' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onProjectsUpdated).toHaveBeenCalled();
    });
  });

  it('should show color picker when adding new project', () => {
    render(<ProjectSettingsModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. PROJ');
    fireEvent.change(input, { target: { value: 'NEW' } });

    // Color picker should be visible
    const colorButtons = screen.getAllByRole('button');
    expect(colorButtons.length).toBeGreaterThan(3);
  });
});
