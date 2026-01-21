import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectTabs from './ProjectTabs';

describe('ProjectTabs', () => {
  const defaultProps = {
    projects: ['PROJ1', 'PROJ2'],
    hiddenProjects: [],
    activeProject: 'PROJ1',
    projectSettings: {
      PROJ1: { color: '#a5c7e9' },
      PROJ2: { color: '#a8e6cf' },
    },
    onSelectProject: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  it('should render project tabs', () => {
    render(<ProjectTabs {...defaultProps} />);

    expect(screen.getByText('PROJ1')).toBeInTheDocument();
    expect(screen.getByText('PROJ2')).toBeInTheDocument();
  });

  it('should return null when no visible projects', () => {
    const { container } = render(
      <ProjectTabs
        {...defaultProps}
        projects={['HIDDEN']}
        hiddenProjects={['HIDDEN']}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should filter out hidden projects', () => {
    render(
      <ProjectTabs
        {...defaultProps}
        hiddenProjects={['PROJ2']}
      />
    );

    expect(screen.getByText('PROJ1')).toBeInTheDocument();
    expect(screen.queryByText('PROJ2')).not.toBeInTheDocument();
  });

  it('should call onSelectProject when tab is clicked', () => {
    const onSelectProject = vi.fn();
    render(<ProjectTabs {...defaultProps} onSelectProject={onSelectProject} />);

    fireEvent.click(screen.getByText('PROJ2'));
    expect(onSelectProject).toHaveBeenCalledWith('PROJ2');
  });

  it('should style active project with background color', () => {
    render(<ProjectTabs {...defaultProps} />);

    const activeTab = screen.getByText('PROJ1');
    expect(activeTab).toHaveStyle({ backgroundColor: '#a5c7e9' });
  });

  it('should not style inactive project with background color', () => {
    render(<ProjectTabs {...defaultProps} />);

    const inactiveTab = screen.getByText('PROJ2');
    expect(inactiveTab).not.toHaveStyle({ backgroundColor: '#a8e6cf' });
  });

  it('should call onOpenSettings when settings button is clicked', () => {
    const onOpenSettings = vi.fn();
    render(<ProjectTabs {...defaultProps} onOpenSettings={onOpenSettings} />);

    const settingsButton = screen.getByTitle('Manage Projects');
    fireEvent.click(settingsButton);

    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('should use default color when project has no color setting', () => {
    render(
      <ProjectTabs
        {...defaultProps}
        projectSettings={{}}
      />
    );

    const activeTab = screen.getByText('PROJ1');
    // Default color is #a5c7e9
    expect(activeTab).toHaveStyle({ backgroundColor: '#a5c7e9' });
  });

  it('should handle null/undefined projects gracefully', () => {
    const { container } = render(
      <ProjectTabs
        {...defaultProps}
        projects={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle empty projects array', () => {
    const { container } = render(
      <ProjectTabs
        {...defaultProps}
        projects={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
