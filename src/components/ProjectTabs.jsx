function ProjectTabs({ projects, hiddenProjects, activeProject, projectSettings, onSelectProject, onOpenSettings }) {
  // Filter out hidden projects
  const visibleProjects = (projects || []).filter(p => !(hiddenProjects || []).includes(p));

  if (visibleProjects.length === 0) {
    return null;
  }

  function getProjectColor(projectKey) {
    return projectSettings?.[projectKey]?.color || '#a5c7e9';
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {visibleProjects.map((project) => {
        const color = getProjectColor(project);
        const isActive = activeProject === project;

        return (
          <button
            key={project}
            onClick={() => onSelectProject(project)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              isActive
                ? 'text-gray-800 dark:text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            style={isActive ? {
              backgroundColor: color,
            } : undefined}
          >
            {project}
          </button>
        );
      })}

      {/* Settings/Manage button */}
      <button
        onClick={onOpenSettings}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md"
        title="Manage Projects"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
}

export default ProjectTabs;
