import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');

export const CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'xray-config.json');
export const DRAFTS_DIR = path.join(PROJECT_ROOT, 'testCases');

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

/**
 * Ensure drafts directory exists
 */
function ensureDraftsDir() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

/**
 * List all draft files
 * Returns array of draft objects sorted by updatedAt (newest first)
 */
export function listDrafts() {
  ensureDraftsDir();
  try {
    const files = fs.readdirSync(DRAFTS_DIR);
    const drafts = [];

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }
      const filePath = path.join(DRAFTS_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const draft = JSON.parse(content);
        drafts.push(draft);
      } catch (err) {
        console.error(`Error reading draft file ${file}:`, err);
      }
    }

    return drafts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    console.error('Error listing drafts:', error);
    return [];
  }
}

/**
 * Read single draft by ID
 */
export function readDraft(id) {
  const filePath = path.join(DRAFTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading draft ${id}:`, error);
    return null;
  }
}

/**
 * Write single draft
 */
export function writeDraft(id, draft) {
  ensureDraftsDir();
  const filePath = path.join(DRAFTS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(draft, null, 2));
  return filePath;
}

/**
 * Delete draft file
 */
export function deleteDraft(id) {
  const filePath = path.join(DRAFTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting draft ${id}:`, error);
    return false;
  }
}
