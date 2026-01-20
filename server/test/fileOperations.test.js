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
      const config = { xrayClientId: 'test-id', projectKey: 'TEST' };

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
    it('should return default settings when file does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { readSettings } = await import('../utils/fileOperations.js');

      const result = readSettings();
      expect(result).toEqual({ functionalAreas: [], labels: [] });
    });

    it('should return parsed settings when file exists', async () => {
      const settings = { functionalAreas: ['Area1', 'Area2'], labels: ['Label1'] };
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings));

      vi.resetModules();
      const { readSettings } = await import('../utils/fileOperations.js');

      const result = readSettings();
      expect(result).toEqual(settings);
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
      expect(result).toEqual({ functionalAreas: [] });
      expect(consoleSpy).toHaveBeenCalledWith('Error reading settings:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('listDrafts with spy', () => {
    it('should create drafts directory if it does not exist', async () => {
      let callCount = 0;
      vi.spyOn(fs, 'existsSync').mockImplementation(() => {
        callCount++;
        return callCount > 1;
      });
      const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      listDrafts();
      expect(mkdirSyncSpy).toHaveBeenCalled();
    });

    it('should return drafts sorted by updatedAt (newest first)', async () => {
      const draft1 = { id: '1', summary: 'Draft 1', updatedAt: 1000 };
      const draft2 = { id: '2', summary: 'Draft 2', updatedAt: 3000 };
      const draft3 = { id: '3', summary: 'Draft 3', updatedAt: 2000 };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['1.json', '2.json', '3.json']);
      vi.spyOn(fs, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(draft1))
        .mockReturnValueOnce(JSON.stringify(draft2))
        .mockReturnValueOnce(JSON.stringify(draft3));

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts();
      expect(result).toEqual([draft2, draft3, draft1]);
    });

    it('should skip non-json files', async () => {
      const draft = { id: '1', summary: 'Draft 1', updatedAt: 1000 };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['1.json', 'readme.txt', '.DS_Store']);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts();
      expect(result).toEqual([draft]);
    });

    it('should log error and skip invalid draft files', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const validDraft = { id: '1', summary: 'Valid Draft', updatedAt: 1000 };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['1.json', '2.json']);
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
        'Error reading draft file 2.json:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should return empty array on directory read error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Directory error');
      });

      vi.resetModules();
      const { listDrafts } = await import('../utils/fileOperations.js');

      const result = listDrafts();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error listing drafts:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('readDraft with spy', () => {
    it('should return null when draft does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { readDraft } = await import('../utils/fileOperations.js');

      const result = readDraft('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should return parsed draft when it exists', async () => {
      const draft = { id: 'test-id', summary: 'Test Draft' };
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(draft));

      vi.resetModules();
      const { readDraft } = await import('../utils/fileOperations.js');

      const result = readDraft('test-id');
      expect(result).toEqual(draft);
    });

    it('should return null and log error on read failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Read error');
      });

      vi.resetModules();
      const { readDraft } = await import('../utils/fileOperations.js');

      const result = readDraft('test-id');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error reading draft test-id:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('deleteDraft with spy', () => {
    it('should return false when draft does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      vi.resetModules();
      const { deleteDraft } = await import('../utils/fileOperations.js');

      const result = deleteDraft('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should delete draft and return true', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);

      vi.resetModules();
      const { deleteDraft, DRAFTS_DIR } = await import('../utils/fileOperations.js');

      const result = deleteDraft('test-id');
      expect(result).toBe(true);
      expect(unlinkSpy).toHaveBeenCalledWith(path.join(DRAFTS_DIR, 'test-id.json'));
    });

    it('should return false and log error on delete failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw new Error('Delete error');
      });

      vi.resetModules();
      const { deleteDraft } = await import('../utils/fileOperations.js');

      const result = deleteDraft('test-id');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting draft test-id:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('writeDraft with spy', () => {
    it('should create drafts directory if it does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeDraft, DRAFTS_DIR } = await import('../utils/fileOperations.js');

      const draft = { id: 'test-id', summary: 'Test Draft' };
      writeDraft('test-id', draft);

      expect(mkdirSpy).toHaveBeenCalledWith(DRAFTS_DIR, { recursive: true });
    });

    it('should write draft file and return path', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeDraft, DRAFTS_DIR } = await import('../utils/fileOperations.js');

      const draft = { id: 'test-id', summary: 'Test Draft' };
      const result = writeDraft('test-id', draft);

      expect(result).toBe(path.join(DRAFTS_DIR, 'test-id.json'));
      expect(writeSpy).toHaveBeenCalledWith(
        path.join(DRAFTS_DIR, 'test-id.json'),
        JSON.stringify(draft, null, 2)
      );
    });
  });

  describe('writeSettings with spy', () => {
    it('should create directory if it does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      vi.resetModules();
      const { writeSettings, SETTINGS_PATH } = await import('../utils/fileOperations.js');

      const settings = { functionalAreas: ['Area1'] };
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

      const settings = { functionalAreas: ['Area1', 'Area2'] };
      const result = writeSettings(settings);

      expect(result).toBe(SETTINGS_PATH);
      expect(writeSpy).toHaveBeenCalledWith(
        SETTINGS_PATH,
        JSON.stringify(settings, null, 2)
      );
    });
  });
});
