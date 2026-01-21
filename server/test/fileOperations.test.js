import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('fileOperations', () => {
  let fileOps;

  beforeEach(async () => {
    vi.resetModules();
    fileOps = await import('../utils/fileOperations.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readConfig with spy', () => {
    it('should return null when config does not exist', async () => {
      const spy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { readConfig, configExists } = await import('../utils/fileOperations.js');

      expect(configExists()).toBe(false);
      expect(readConfig()).toBeNull();
      spy.mockRestore();
    });

    it('should return parsed config when it exists', async () => {
      const config = { xrayClientId: 'test-id', xrayClientSecret: 'secret', jiraBaseUrl: 'https://test.atlassian.net' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

      vi.resetModules();
      const { readConfig } = await import('../utils/fileOperations.js');

      const result = readConfig();
      expect(result).toEqual(config);
    });

    it('should return null and log error on read failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Read error');
      });

      vi.resetModules();
      const { readConfig } = await import('../utils/fileOperations.js');

      const result = readConfig();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error reading config:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should return null on invalid JSON', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json{');

      vi.resetModules();
      const { readConfig } = await import('../utils/fileOperations.js');

      const result = readConfig();
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('writeConfig with spy', () => {
    it('should create directory if it does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeConfig, CONFIG_PATH } = await import('../utils/fileOperations.js');

      const config = { xrayClientId: 'test-id' };
      writeConfig(config);

      expect(mkdirSyncSpy).toHaveBeenCalledWith(
        path.dirname(CONFIG_PATH),
        { recursive: true }
      );
    });

    it('should not create directory if it exists', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeConfig } = await import('../utils/fileOperations.js');

      const config = { xrayClientId: 'test-id' };
      writeConfig(config);

      expect(mkdirSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('readSettings with spy', () => {
    const DEFAULT_SETTINGS = {
      projects: [],
      hiddenProjects: [],
      activeProject: null,
      projectSettings: {},
    };

    it('should return default settings when file does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { readSettings } = await import('../utils/fileOperations.js');

      const result = readSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('should return parsed settings merged with defaults when file exists', async () => {
      const settings = {
        projects: ['TEST', 'DEMO'],
        activeProject: 'TEST',
        projectSettings: {
          TEST: { functionalAreas: ['Area1'], labels: ['Label1'], collections: [] },
        },
      };
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));

      vi.resetModules();
      const { readSettings } = await import('../utils/fileOperations.js');

      const result = readSettings();
      // Should merge with defaults
      expect(result).toEqual({
        ...DEFAULT_SETTINGS,
        ...settings,
      });
    });

    it('should return default settings on read error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Read error');
      });

      vi.resetModules();
      const { readSettings } = await import('../utils/fileOperations.js');

      const result = readSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(consoleSpy).toHaveBeenCalledWith('Error reading settings:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('writeSettings with spy', () => {
    it('should create directory if it does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeSettings, SETTINGS_PATH } = await import('../utils/fileOperations.js');

      const settings = { projects: ['TEST'] };
      writeSettings(settings);

      expect(mkdirSpy).toHaveBeenCalledWith(
        path.dirname(SETTINGS_PATH),
        { recursive: true }
      );
    });

    it('should write settings file and return path', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeSettings, SETTINGS_PATH } = await import('../utils/fileOperations.js');

      const settings = { projects: ['TEST', 'DEMO'], activeProject: 'TEST' };
      const result = writeSettings(settings);

      expect(result).toBe(SETTINGS_PATH);
      expect(writeSpy).toHaveBeenCalledWith(
        SETTINGS_PATH,
        JSON.stringify(settings, null, 2)
      );
    });
  });

  describe('utility functions', () => {
    it('slugify should convert strings to URL-friendly slugs', async () => {
      vi.resetModules();
      const { slugify } = await import('../utils/fileOperations.js');

      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test Case 123')).toBe('test-case-123');
      expect(slugify('Special!@#$Characters')).toBe('specialcharacters');
      expect(slugify('')).toBe('untitled');
      expect(slugify(null)).toBe('untitled');
    });

    it('sanitizeFolderName should make folder-safe names', async () => {
      vi.resetModules();
      const { sanitizeFolderName } = await import('../utils/fileOperations.js');

      expect(sanitizeFolderName('My Folder')).toBe('My_Folder');
      expect(sanitizeFolderName('Path/With:Special<Chars>')).toBe('PathWithSpecialChars');
      expect(sanitizeFolderName('')).toBe('General');
      expect(sanitizeFolderName(null)).toBe('General');
    });

    it('parseSummary should extract area and title', async () => {
      vi.resetModules();
      const { parseSummary } = await import('../utils/fileOperations.js');

      expect(parseSummary('Area | Layer | Title')).toEqual({ area: 'Area', title: 'Title' });
      expect(parseSummary('Area | Title')).toEqual({ area: 'Area', title: 'Title' });
      expect(parseSummary('Just Title')).toEqual({ area: 'General', title: 'Just Title' });
      expect(parseSummary('')).toEqual({ area: 'General', title: 'untitled' });
      expect(parseSummary(null)).toEqual({ area: 'General', title: 'untitled' });
    });
  });

  describe('listDrafts with hierarchical structure', () => {
    it('should create drafts directory if it does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      listDrafts();
      expect(mkdirSyncSpy).toHaveBeenCalled();
    });

    it('should return empty array when no projects exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts();
      expect(result).toEqual([]);
    });

    it('should return drafts from hierarchical project/area structure', async () => {
      const draft1 = { id: '1', summary: 'Draft 1', updatedAt: 1000, projectKey: 'TEST' };
      const draft2 = { id: '2', summary: 'Draft 2', updatedAt: 3000, projectKey: 'TEST' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      // Mock readdirSync for different directory levels
      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('testCases')) {
          // Top level: project directories
          return options?.withFileTypes
            ? [{ name: 'TEST', isDirectory: () => true }]
            : ['TEST'];
        } else if (dir.includes('TEST') && !dir.includes('General')) {
          // Project level: area directories
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else {
          // Area level: draft files
          return ['draft-1-12345678.json', 'draft-2-87654321.json'];
        }
      });

      vi.spyOn(fs, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(draft1))
        .mockReturnValueOnce(JSON.stringify(draft2));

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts();
      // Sorted by updatedAt descending
      expect(result).toEqual([draft2, draft1]);
    });

    it('should filter drafts by projectKey', async () => {
      const draft = { id: '1', summary: 'Draft 1', updatedAt: 1000, projectKey: 'DEMO' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('DEMO')) {
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else if (dir.includes('General')) {
          return ['draft-1.json'];
        }
        return [];
      });

      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts('DEMO');
      expect(result).toEqual([draft]);
    });

    it('should handle errors and continue processing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const validDraft = { id: '1', summary: 'Valid Draft', updatedAt: 1000 };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('testCases')) {
          return options?.withFileTypes
            ? [{ name: 'TEST', isDirectory: () => true }]
            : ['TEST'];
        } else if (dir.includes('TEST') && !dir.includes('General')) {
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else {
          return ['valid.json', 'invalid.json'];
        }
      });

      vi.spyOn(fs, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(validDraft))
        .mockImplementationOnce(() => {
          throw new Error('Invalid JSON');
        });

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts();
      expect(result).toEqual([validDraft]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error reading draft file invalid.json:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('findDraftById', () => {
    it('should return null when DRAFTS_DIR does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { findDraftById } = await import('../utils/fileOperations.js');

      const result = findDraftById('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should find draft by ID in hierarchical structure', async () => {
      const draft = { id: 'test-id-12345678', summary: 'Test Draft', projectKey: 'TEST' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('testCases')) {
          return options?.withFileTypes
            ? [{ name: 'TEST', isDirectory: () => true }]
            : ['TEST'];
        } else if (dir.includes('TEST') && !dir.includes('General')) {
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else {
          return ['test-draft-test-id-.json'];
        }
      });

      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { findDraftById } = await import('../utils/fileOperations.js');

      const result = findDraftById('test-id-12345678');
      expect(result).not.toBeNull();
      expect(result.draft).toEqual(draft);
    });
  });

  describe('readDraft with findDraftById', () => {
    it('should return null when draft does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { readDraft } = await import('../utils/fileOperations.js');

      const result = readDraft('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should return parsed draft when found', async () => {
      const draft = { id: 'test-id-12345678', summary: 'Test Draft', projectKey: 'TEST' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('testCases')) {
          return options?.withFileTypes
            ? [{ name: 'TEST', isDirectory: () => true }]
            : ['TEST'];
        } else if (dir.includes('TEST') && !dir.includes('General')) {
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else {
          return ['test-draft-test-id-.json'];
        }
      });

      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { readDraft } = await import('../utils/fileOperations.js');

      const result = readDraft('test-id-12345678');
      expect(result).toEqual(draft);
    });
  });

  describe('deleteDraft with findDraftById', () => {
    it('should return false when draft does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { deleteDraft } = await import('../utils/fileOperations.js');

      const result = deleteDraft('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should delete draft and return true', async () => {
      const draft = { id: 'test-id-12345678', summary: 'Test Draft', projectKey: 'TEST' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'rmdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('testCases')) {
          return options?.withFileTypes
            ? [{ name: 'TEST', isDirectory: () => true }]
            : ['TEST'];
        } else if (dir.includes('TEST') && !dir.includes('General')) {
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else {
          return ['test-draft-test-id-.json'];
        }
      });
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { deleteDraft } = await import('../utils/fileOperations.js');

      const result = deleteDraft('test-id-12345678');
      expect(result).toBe(true);
      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should return false and log error on delete failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const draft = { id: 'test-id-12345678', summary: 'Test Draft', projectKey: 'TEST' };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw new Error('Delete error');
      });
      vi.spyOn(fs, 'readdirSync').mockImplementation((dir, options) => {
        if (dir.endsWith('testCases')) {
          return options?.withFileTypes
            ? [{ name: 'TEST', isDirectory: () => true }]
            : ['TEST'];
        } else if (dir.includes('TEST') && !dir.includes('General')) {
          return options?.withFileTypes
            ? [{ name: 'General', isDirectory: () => true }]
            : ['General'];
        } else {
          return ['test-draft-test-id-.json'];
        }
      });
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { deleteDraft } = await import('../utils/fileOperations.js');

      const result = deleteDraft('test-id-12345678');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting draft test-id-12345678:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('writeDraft with hierarchical structure', () => {
    it('should create project/area directories and write draft', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

      vi.resetModules();
      const { writeDraft } = await import('../utils/fileOperations.js');

      const draft = { id: 'test-id-12345678', summary: 'Area | Layer | Test Title', projectKey: 'TEST' };
      const result = writeDraft('test-id-12345678', draft);

      // Should create directory structure
      expect(mkdirSpy).toHaveBeenCalled();
      // Should write the draft
      expect(writeSpy).toHaveBeenCalled();
      // Path should include project and area
      expect(result).toContain('TEST');
      expect(result).toContain('Area');
    });

    it('should use Default project when projectKey not specified', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

      vi.resetModules();
      const { writeDraft } = await import('../utils/fileOperations.js');

      const draft = { id: 'test-id', summary: 'Test Title' };
      const result = writeDraft('test-id', draft);

      expect(result).toContain('Default');
    });
  });

  describe('syncSettingsWithFileSystem', () => {
    it('should create DRAFTS_DIR if it does not exist', async () => {
      const existsSyncSpy = vi.spyOn(fs, 'existsSync')
        .mockReturnValueOnce(true) // SETTINGS_PATH exists
        .mockReturnValueOnce(false); // DRAFTS_DIR does not exist
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        projects: [],
        hiddenProjects: [],
        activeProject: null,
        projectSettings: {},
      }));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

      vi.resetModules();
      const { syncSettingsWithFileSystem } = await import('../utils/fileOperations.js');

      syncSettingsWithFileSystem();
      expect(mkdirSpy).toHaveBeenCalled();
    });

    it('should remove projects without folders from settings', async () => {
      const settings = {
        projects: ['EXISTING', 'MISSING'],
        hiddenProjects: [],
        activeProject: 'EXISTING',
        projectSettings: {
          EXISTING: { functionalAreas: [], labels: [], collections: [] },
          MISSING: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'EXISTING', isDirectory: () => true },
      ]);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.resetModules();
      const { syncSettingsWithFileSystem } = await import('../utils/fileOperations.js');

      const modified = syncSettingsWithFileSystem();
      expect(modified).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Removing stale projects from settings:', ['MISSING']);
      // Verify writeSettings was called with updated settings
      expect(writeSpy).toHaveBeenCalled();
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.projects).toEqual(['EXISTING']);
      expect(writtenSettings.projectSettings).not.toHaveProperty('MISSING');
      consoleSpy.mockRestore();
    });

    it('should update activeProject if it no longer exists', async () => {
      const settings = {
        projects: ['DELETED', 'REMAINING'],
        hiddenProjects: [],
        activeProject: 'DELETED',
        projectSettings: {
          DELETED: { functionalAreas: [], labels: [], collections: [] },
          REMAINING: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'REMAINING', isDirectory: () => true },
      ]);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.resetModules();
      const { syncSettingsWithFileSystem } = await import('../utils/fileOperations.js');

      syncSettingsWithFileSystem();
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.activeProject).toBe('REMAINING');
    });

    it('should remove hidden projects that no longer exist', async () => {
      const settings = {
        projects: ['VISIBLE'],
        hiddenProjects: ['HIDDEN_MISSING'],
        activeProject: 'VISIBLE',
        projectSettings: {
          VISIBLE: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'VISIBLE', isDirectory: () => true },
      ]);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.resetModules();
      const { syncSettingsWithFileSystem } = await import('../utils/fileOperations.js');

      syncSettingsWithFileSystem();
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.hiddenProjects).toEqual([]);
    });

    it('should return false when no modifications needed', async () => {
      const settings = {
        projects: ['PROJ'],
        hiddenProjects: [],
        activeProject: 'PROJ',
        projectSettings: {
          PROJ: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'PROJ', isDirectory: () => true },
      ]);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { syncSettingsWithFileSystem } = await import('../utils/fileOperations.js');

      const modified = syncSettingsWithFileSystem();
      expect(modified).toBe(false);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should set activeProject to null when no visible projects remain', async () => {
      const settings = {
        projects: ['DELETED'],
        hiddenProjects: [],
        activeProject: 'DELETED',
        projectSettings: {
          DELETED: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.resetModules();
      const { syncSettingsWithFileSystem } = await import('../utils/fileOperations.js');

      syncSettingsWithFileSystem();
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.activeProject).toBeNull();
    });
  });

  describe('getSettingsSynced', () => {
    it('should sync settings and return them', async () => {
      const settings = {
        projects: ['PROJ'],
        hiddenProjects: [],
        activeProject: 'PROJ',
        projectSettings: {
          PROJ: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'PROJ', isDirectory: () => true },
      ]);

      vi.resetModules();
      const { getSettingsSynced } = await import('../utils/fileOperations.js');

      const result = getSettingsSynced();
      expect(result.projects).toEqual(['PROJ']);
      expect(result.activeProject).toBe('PROJ');
    });

    it('should return cleaned settings after sync removes stale projects', async () => {
      const settings = {
        projects: ['VALID', 'STALE'],
        hiddenProjects: [],
        activeProject: 'VALID',
        projectSettings: {
          VALID: { functionalAreas: [], labels: [], collections: [] },
          STALE: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      // readFileSync called multiple times - first for sync, then for return
      vi.spyOn(fs, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(settings)) // First read in syncSettingsWithFileSystem
        .mockReturnValueOnce(JSON.stringify({ // Second read in readSettings after write
          projects: ['VALID'],
          hiddenProjects: [],
          activeProject: 'VALID',
          projectSettings: {
            VALID: { functionalAreas: [], labels: [], collections: [] },
          },
        }));
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'VALID', isDirectory: () => true },
      ]);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.resetModules();
      const { getSettingsSynced } = await import('../utils/fileOperations.js');

      const result = getSettingsSynced();
      expect(result.projects).toEqual(['VALID']);
      expect(result.projectSettings).not.toHaveProperty('STALE');
    });
  });

  describe('project management functions', () => {
    it('addProject should create project directory and settings', async () => {
      const settings = {
        projects: [],
        hiddenProjects: [],
        activeProject: null,
        projectSettings: {},
      };

      // Settings file exists, but project directory does not
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (p.includes('NEWPROJ')) return false; // Project dir doesn't exist
        return true; // Settings file exists
      });
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { addProject } = await import('../utils/fileOperations.js');

      const result = addProject('NEWPROJ', '#a5c7e9');
      expect(result.success).toBe(true);
      expect(mkdirSpy).toHaveBeenCalled();
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.projects).toContain('NEWPROJ');
      expect(writtenSettings.projectSettings.NEWPROJ.color).toBe('#a5c7e9');
    });

    it('addProject should unhide existing hidden project', async () => {
      const settings = {
        projects: ['EXISTING'],
        hiddenProjects: ['EXISTING'],
        activeProject: null,
        projectSettings: {
          EXISTING: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { addProject } = await import('../utils/fileOperations.js');

      const result = addProject('EXISTING');
      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(true);
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.hiddenProjects).not.toContain('EXISTING');
    });

    it('hideProject should add project to hiddenProjects', async () => {
      const settings = {
        projects: ['PROJ1', 'PROJ2'],
        hiddenProjects: [],
        activeProject: 'PROJ1',
        projectSettings: {},
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { hideProject } = await import('../utils/fileOperations.js');

      const result = hideProject('PROJ1');
      expect(result.success).toBe(true);
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.hiddenProjects).toContain('PROJ1');
      expect(writtenSettings.activeProject).toBe('PROJ2');
    });

    it('unhideProject should remove project from hiddenProjects', async () => {
      const settings = {
        projects: ['PROJ'],
        hiddenProjects: ['PROJ'],
        activeProject: null,
        projectSettings: {},
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { unhideProject } = await import('../utils/fileOperations.js');

      const result = unhideProject('PROJ');
      expect(result.success).toBe(true);
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.hiddenProjects).not.toContain('PROJ');
    });

    it('setActiveProject should update activeProject', async () => {
      const settings = {
        projects: ['PROJ1', 'PROJ2'],
        hiddenProjects: [],
        activeProject: 'PROJ1',
        projectSettings: {},
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { setActiveProject } = await import('../utils/fileOperations.js');

      const result = setActiveProject('PROJ2');
      expect(result.success).toBe(true);
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.activeProject).toBe('PROJ2');
    });

    it('setActiveProject should return error for non-existent project', async () => {
      const settings = {
        projects: ['PROJ1'],
        hiddenProjects: [],
        activeProject: 'PROJ1',
        projectSettings: {},
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));

      vi.resetModules();
      const { setActiveProject } = await import('../utils/fileOperations.js');

      const result = setActiveProject('NONEXISTENT');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found');
    });

    it('getProjectSettings should return settings for project', async () => {
      const settings = {
        projects: ['PROJ'],
        hiddenProjects: [],
        activeProject: 'PROJ',
        projectSettings: {
          PROJ: { functionalAreas: ['Area1'], labels: ['Label1'], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));

      vi.resetModules();
      const { getProjectSettings } = await import('../utils/fileOperations.js');

      const result = getProjectSettings('PROJ');
      expect(result.functionalAreas).toEqual(['Area1']);
      expect(result.labels).toEqual(['Label1']);
    });

    it('getProjectSettings should return defaults for non-existent project', async () => {
      const settings = {
        projects: [],
        hiddenProjects: [],
        activeProject: null,
        projectSettings: {},
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));

      vi.resetModules();
      const { getProjectSettings } = await import('../utils/fileOperations.js');

      const result = getProjectSettings('NONEXISTENT');
      expect(result).toEqual({ functionalAreas: [], labels: [], collections: [] });
    });

    it('saveProjectSettings should update project settings', async () => {
      const settings = {
        projects: ['PROJ'],
        hiddenProjects: [],
        activeProject: 'PROJ',
        projectSettings: {
          PROJ: { functionalAreas: [], labels: [], collections: [] },
        },
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { saveProjectSettings } = await import('../utils/fileOperations.js');

      saveProjectSettings('PROJ', { functionalAreas: ['NewArea'], labels: ['NewLabel'], collections: [] });
      const writtenSettings = JSON.parse(writeSpy.mock.calls[0][1]);
      expect(writtenSettings.projectSettings.PROJ.functionalAreas).toEqual(['NewArea']);
    });
  });
});
