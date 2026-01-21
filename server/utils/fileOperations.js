import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');

export const CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'xray-config.json');
export const SETTINGS_PATH = path.join(PROJECT_ROOT, 'config', 'settings.json');
export const DRAFTS_DIR = path.join(PROJECT_ROOT, 'testCases');

// ============ Utility Functions ============

/**
 * Slugify a string for use in filenames
 */
export function slugify(str) {
  if (!str) return 'untitled';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')     // Spaces to hyphens
    .replace(/-+/g, '-')      // Multiple hyphens to single
    .replace(/^-|-$/g, '')    // Trim hyphens from ends
    || 'untitled';
}

/**
 * Sanitize folder name (more permissive than slugify)
 */
export function sanitizeFolderName(str) {
  if (!str) return 'General';
  return str
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove filesystem-unsafe chars
    .replace(/\s+/g, '_')         // Spaces to underscores
    || 'General';
}

/**
 * Parse summary to extract area and title
 * Format: "Functional Area | Layer | Title"
 */
export function parseSummary(summary) {
  if (!summary) {
    return { area: 'General', title: 'untitled' };
  }

  const parts = summary.split('|').map(p => p.trim());

  if (parts.length >= 3) {
    // Full format: Area | Layer | Title
    return { area: parts[0], title: parts[2] };
  } else if (parts.length === 2) {
    // Partial: Area | Title
    return { area: parts[0], title: parts[1] };
  } else {
    // Just title
    return { area: 'General', title: summary };
  }
}

// ============ Config Functions ============

/**
 * Check if config file exists
 */
export function configExists() {
  return fs.existsSync(CONFIG_PATH);
}

/**
 * Read config file
 */
export function readConfig() {
  if (!configExists()) {
    return null;
  }
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
}

/**
 * Write config file
 */
export function writeConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  return CONFIG_PATH;
}

// ============ Settings Functions ============

const DEFAULT_SETTINGS = {
  projects: [],
  hiddenProjects: [],
  activeProject: null,
  projectSettings: {},
};

/**
 * Read settings file
 */
export function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const content = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(content);
    // Merge with defaults for any missing fields
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error('Error reading settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Sync settings with file system - removes projects that no longer have folders
 * Returns true if settings were modified
 */
export function syncSettingsWithFileSystem() {
  const settings = readSettings();
  let modified = false;

  // Ensure testCases directory exists
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }

  // Get actual project folders from file system
  const existingFolders = fs.readdirSync(DRAFTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  // Filter out projects that don't have folders
  const validProjects = settings.projects.filter(p => existingFolders.includes(p));
  if (validProjects.length !== settings.projects.length) {
    const removedProjects = settings.projects.filter(p => !existingFolders.includes(p));
    console.log('Removing stale projects from settings:', removedProjects);
    settings.projects = validProjects;
    modified = true;

    // Also clean up projectSettings for removed projects
    for (const removed of removedProjects) {
      delete settings.projectSettings[removed];
    }
  }

  // Filter out hidden projects that don't exist
  const validHidden = settings.hiddenProjects.filter(p => existingFolders.includes(p));
  if (validHidden.length !== settings.hiddenProjects.length) {
    settings.hiddenProjects = validHidden;
    modified = true;
  }

  // Fix active project if it no longer exists
  if (settings.activeProject && !validProjects.includes(settings.activeProject)) {
    const visibleProjects = validProjects.filter(p => !settings.hiddenProjects.includes(p));
    settings.activeProject = visibleProjects[0] || null;
    modified = true;
  }

  // Save if modified
  if (modified) {
    writeSettings(settings);
  }

  return modified;
}

/**
 * Get settings synced with file system
 */
export function getSettingsSynced() {
  syncSettingsWithFileSystem();
  return readSettings();
}

/**
 * Write settings file
 */
export function writeSettings(settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  return SETTINGS_PATH;
}

/**
 * Get settings for a specific project
 */
export function getProjectSettings(projectKey) {
  const settings = readSettings();
  return settings.projectSettings?.[projectKey] || {
    functionalAreas: [],
    labels: [],
    collections: [],
  };
}

/**
 * Save settings for a specific project
 */
export function saveProjectSettings(projectKey, projectSettings) {
  const settings = readSettings();
  if (!settings.projectSettings) {
    settings.projectSettings = {};
  }
  settings.projectSettings[projectKey] = projectSettings;
  writeSettings(settings);
}

// Default pastel color palette
export const PASTEL_COLORS = [
  '#a5c7e9', // Soft blue
  '#a8e6cf', // Mint
  '#c9b8e8', // Lavender
  '#ffd3b6', // Peach
  '#ffb6c1', // Soft pink
  '#f5b5b5', // Light coral
  '#f9e9a1', // Soft yellow
  '#a8e0e0', // Light teal
];

/**
 * Add a new project
 */
export function addProject(projectKey, color) {
  const settings = readSettings();

  // Check if project already exists
  if (settings.projects.includes(projectKey)) {
    // Maybe it's hidden, unhide it
    settings.hiddenProjects = settings.hiddenProjects.filter(p => p !== projectKey);
    writeSettings(settings);
    return { success: true, alreadyExists: true };
  }

  settings.projects.push(projectKey);

  // Auto-assign color if not provided (cycle through palette)
  const assignedColor = color || PASTEL_COLORS[(settings.projects.length - 1) % PASTEL_COLORS.length];

  // Initialize project settings
  if (!settings.projectSettings) {
    settings.projectSettings = {};
  }
  settings.projectSettings[projectKey] = {
    functionalAreas: [],
    labels: [],
    collections: [],
    color: assignedColor,
  };

  // Set as active if first project
  if (!settings.activeProject) {
    settings.activeProject = projectKey;
  }

  writeSettings(settings);

  // Create project directory
  const projectDir = path.join(DRAFTS_DIR, projectKey);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  return { success: true };
}

/**
 * Hide a project (not delete)
 */
export function hideProject(projectKey) {
  const settings = readSettings();

  if (!settings.hiddenProjects.includes(projectKey)) {
    settings.hiddenProjects.push(projectKey);
  }

  // If hiding active project, switch to another
  if (settings.activeProject === projectKey) {
    const visibleProjects = settings.projects.filter(
      p => !settings.hiddenProjects.includes(p)
    );
    settings.activeProject = visibleProjects[0] || null;
  }

  writeSettings(settings);
  return { success: true };
}

/**
 * Unhide a project
 */
export function unhideProject(projectKey) {
  const settings = readSettings();
  settings.hiddenProjects = settings.hiddenProjects.filter(p => p !== projectKey);
  writeSettings(settings);
  return { success: true };
}

/**
 * Set active project
 */
export function setActiveProject(projectKey) {
  const settings = readSettings();

  if (!settings.projects.includes(projectKey)) {
    return { success: false, error: 'Project not found' };
  }

  settings.activeProject = projectKey;
  writeSettings(settings);
  return { success: true };
}

// ============ Draft Functions ============

/**
 * Get draft file path based on project, area, and title
 */
export function getDraftPath(projectKey, area, title, id) {
  const sanitizedArea = sanitizeFolderName(area);
  const slugifiedTitle = slugify(title);

  // Use short ID suffix to avoid collisions
  const shortId = id ? id.substring(0, 8) : '';
  const filename = shortId ? `${slugifiedTitle}-${shortId}.json` : `${slugifiedTitle}.json`;

  return path.join(DRAFTS_DIR, projectKey, sanitizedArea, filename);
}

/**
 * Ensure directory exists for a draft
 */
function ensureDraftDir(projectKey, area) {
  const sanitizedArea = sanitizeFolderName(area);
  const dir = path.join(DRAFTS_DIR, projectKey, sanitizedArea);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Find draft file by ID (searches all project/area folders)
 */
export function findDraftById(id) {
  if (!fs.existsSync(DRAFTS_DIR)) {
    return null;
  }

  // Search through all project/area directories
  const projects = fs.readdirSync(DRAFTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const project of projects) {
    const projectDir = path.join(DRAFTS_DIR, project);
    const areas = fs.readdirSync(projectDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const area of areas) {
      const areaDir = path.join(projectDir, area);
      const files = fs.readdirSync(areaDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        // Check if file contains this ID (either in filename or content)
        if (file.includes(id.substring(0, 8))) {
          const filePath = path.join(areaDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const draft = JSON.parse(content);
            if (draft.id === id) {
              return { draft, filePath };
            }
          } catch (err) {
            // Skip invalid files
          }
        }
      }
    }
  }

  return null;
}

/**
 * List all drafts, optionally filtered by project
 */
export function listDrafts(projectKey = null) {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
    return [];
  }

  const drafts = [];

  // Get projects to scan
  let projects;
  if (projectKey) {
    projects = [projectKey];
  } else {
    projects = fs.readdirSync(DRAFTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  }

  for (const project of projects) {
    const projectDir = path.join(DRAFTS_DIR, project);
    if (!fs.existsSync(projectDir)) continue;

    const areas = fs.readdirSync(projectDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const area of areas) {
      const areaDir = path.join(projectDir, area);
      const files = fs.readdirSync(areaDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const filePath = path.join(areaDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const draft = JSON.parse(content);
          drafts.push(draft);
        } catch (err) {
          console.error(`Error reading draft file ${file}:`, err);
        }
      }
    }
  }

  return drafts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Read single draft by ID
 */
export function readDraft(id) {
  const result = findDraftById(id);
  return result ? result.draft : null;
}

/**
 * Write single draft
 */
export function writeDraft(id, draft) {
  const { area, title } = parseSummary(draft.summary);
  const projectKey = draft.projectKey || 'Default';

  // Ensure directory exists
  ensureDraftDir(projectKey, area);

  // Check if draft already exists (might need to move it)
  const existing = findDraftById(id);
  if (existing) {
    // Delete old file if location changed
    const newPath = getDraftPath(projectKey, area, title, id);
    if (existing.filePath !== newPath) {
      fs.unlinkSync(existing.filePath);
      // Clean up empty directories
      cleanEmptyDirs(path.dirname(existing.filePath));
    }
  }

  const filePath = getDraftPath(projectKey, area, title, id);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(draft, null, 2));
  return filePath;
}

/**
 * Delete draft file
 */
export function deleteDraft(id) {
  const result = findDraftById(id);
  if (!result) {
    return false;
  }

  try {
    fs.unlinkSync(result.filePath);
    // Clean up empty directories
    cleanEmptyDirs(path.dirname(result.filePath));
    return true;
  } catch (error) {
    console.error(`Error deleting draft ${id}:`, error);
    return false;
  }
}

/**
 * Clean up empty directories recursively
 */
function cleanEmptyDirs(dir) {
  // Don't go above DRAFTS_DIR
  if (!dir.startsWith(DRAFTS_DIR) || dir === DRAFTS_DIR) {
    return;
  }

  try {
    const files = fs.readdirSync(dir);
    if (files.length === 0) {
      fs.rmdirSync(dir);
      // Recurse up
      cleanEmptyDirs(path.dirname(dir));
    }
  } catch (err) {
    // Directory might not exist or not be empty
  }
}

/**
 * Delete all drafts (for cleanup/migration)
 */
export function deleteAllDrafts() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    return;
  }

  fs.rmSync(DRAFTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}
